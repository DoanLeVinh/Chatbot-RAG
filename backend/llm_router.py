"""Universal Multi-Provider & Multi-Key LLM Router for LogiChat RAG.

Supports seamless failover and load rotation across:
  1. OpenRouter (Multi-key + Multi-model: DeepSeek, GPT-4o-mini, Llama 3.3, etc.)
  2. Google Gemini (Multi-key + Multi-model: Gemini 2.5 Flash, 2.0 Flash, 1.5 Flash)
  3. Ollama Local (Auto-detection of models: Llama 3.2, Qwen, Mistral)
  4. Custom OpenAI-compatible Endpoints

When any key or model hits a rate limit (HTTP 429), quota exhaustion (HTTP 402/403),
or network timeout, the router automatically cooldowns that key and switches
seamlessly to the next key / next provider without breaking user requests.
"""

import os
import re
import sys
import time
import json
import logging
import urllib.request
import urllib.error
from typing import Optional, Tuple, List, Dict, Any
from dotenv import load_dotenv

load_dotenv()

# Logger setup
logger = logging.getLogger("LLMRouter")
if not logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [LLMRouter] %(message)s", "%H:%M:%S"))
    logger.addHandler(handler)
    logger.setLevel(logging.INFO)


class KeyState:
    def __init__(self, key: str, provider: str):
        self.key = key.strip().strip('"').strip("'")
        self.provider = provider
        self.cooldown_until = 0.0
        self.success_count = 0
        self.fail_count = 0

    @property
    def is_available(self) -> bool:
        return bool(self.key) and time.time() >= self.cooldown_until

    def mark_exhausted(self, cooldown_seconds: int = 300, reason: str = ""):
        self.cooldown_until = time.time() + cooldown_seconds
        self.fail_count += 1
        logger.warning(f"Key for {self.provider} ({self.key[:8]}...{self.key[-4:] if len(self.key)>12 else ''}) cooldown {cooldown_seconds}s. Reason: {reason}")

    def mark_success(self):
        self.success_count += 1
        self.cooldown_until = 0.0


class LLMRouter:
    def __init__(self):
        self.reload_config()

    def reload_config(self):
        """Load and parse environment configuration for keys and provider order."""
        load_dotenv(override=True)

        # 1. Parse OpenRouter Keys
        raw_or = os.getenv("OPENROUTER_API_KEYS") or os.getenv("OPENROUTER_API_KEY") or ""
        self.openrouter_keys = [
            KeyState(k, "openrouter") for k in raw_or.split(",") if k.strip()
        ]

        # 2. Parse Gemini Keys
        raw_gemini = os.getenv("GEMINI_API_KEYS") or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or ""
        self.gemini_keys = [
            KeyState(k, "gemini") for k in raw_gemini.split(",") if k.strip()
        ]

        # 3. Parse OpenAI / Custom Compatible Keys
        raw_openai = os.getenv("OPENAI_API_KEYS") or os.getenv("OPENAI_API_KEY") or ""
        self.openai_keys = [
            KeyState(k, "openai") for k in raw_openai.split(",") if k.strip()
        ]
        self.openai_base = os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1").rstrip("/")

        # 4. Ollama Configuration
        self.ollama_host = os.getenv("OLLAMA_HOST", "http://localhost:11434").rstrip("/")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.2:latest")

        # 5. Groq Keys
        raw_groq = os.getenv("GROQ_API_KEYS") or os.getenv("GROQ_API_KEY") or ""
        self.groq_keys = [
            KeyState(k, "groq") for k in raw_groq.split(",") if k.strip()
        ]
        self.groq_models = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",
            "gemma2-9b-it",
            "mixtral-8x7b-32768",
        ]

        # 6. Provider Priority Order
        raw_order = os.getenv("LLM_PROVIDER_ORDER", "openrouter,gemini,groq,ollama,openai")
        self.provider_order = [p.strip().lower() for p in raw_order.split(",") if p.strip()]

        # Model Candidates
        self.openrouter_models = [
            "deepseek/deepseek-chat",
            "openai/gpt-4o-mini",
            "meta-llama/llama-3.3-70b-instruct",
            "qwen/qwen-2.5-72b-instruct",
            "google/gemini-flash-1.5",
        ]

        self.gemini_models = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-flash-latest",
        ]

        logger.info(
            f"Config loaded: OpenRouter Keys={len(self.openrouter_keys)}, "
            f"Gemini Keys={len(self.gemini_keys)}, "
            f"OpenAI Keys={len(self.openai_keys)}, "
            f"Groq Keys={len(self.groq_keys)}, "
            f"Ollama Host={self.ollama_host}, Order={self.provider_order}"
        )

    def _build_messages(self, system_prompt: str, user_prompt: str, chat_history: list = None) -> list:
        msgs = [{"role": "system", "content": system_prompt}]
        if chat_history:
            msgs.extend(chat_history)
        msgs.append({"role": "user", "content": user_prompt})
        return msgs

    def _call_openrouter(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2) -> Optional[Tuple[str, str]]:
        """Call OpenRouter with active key rotation and model fallback."""
        available_keys = [k for k in self.openrouter_keys if k.is_available]
        if not available_keys:
            # If all are in cooldown, reset oldest cooldown
            if self.openrouter_keys:
                oldest = min(self.openrouter_keys, key=lambda k: k.cooldown_until)
                oldest.cooldown_until = 0
                available_keys = [oldest]
            else:
                return None

        url = "https://openrouter.ai/api/v1/chat/completions"

        for key_state in available_keys:
            for model_name in self.openrouter_models:
                payload = {
                    "model": model_name,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": self._build_messages(system_prompt, user_prompt, chat_history)
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {key_state.key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "LogiChat RAG"
                    },
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        if "choices" in data and len(data["choices"]) > 0:
                            content = data["choices"][0]["message"]["content"]
                            if content and content.strip():
                                key_state.mark_success()
                                return content.strip(), f"openrouter:{model_name}"
                except urllib.error.HTTPError as exc:
                    err_body = ""
                    try:
                        err_body = exc.read().decode("utf-8")
                    except Exception:
                        pass

                    if exc.code in (429, 402, 403):
                        key_state.mark_exhausted(cooldown_seconds=300, reason=f"HTTP {exc.code} {err_body[:100]}")
                        break  # Break out to next key
                    elif exc.code == 404:
                        # Model not available, try next model candidate
                        continue
                    else:
                        logger.warning(f"OpenRouter [{model_name}] HTTP {exc.code}: {err_body[:100]}")
                        continue
                except Exception as exc:
                    logger.warning(f"OpenRouter [{model_name}] Error: {exc}")
                    continue

        return None

    def _call_gemini(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 4096, temperature: float = 0.2) -> Optional[Tuple[str, str]]:
        """Call Google Gemini API with active key rotation and model fallback."""
        available_keys = [k for k in self.gemini_keys if k.is_available]
        if not available_keys:
            if self.gemini_keys:
                oldest = min(self.gemini_keys, key=lambda k: k.cooldown_until)
                oldest.cooldown_until = 0
                available_keys = [oldest]
            else:
                return None

        for key_state in available_keys:
            payload = {
                "system_instruction": {"parts": [{"text": system_prompt}]},
                "contents": [],
                "generationConfig": {
                    "temperature": temperature,
                    "maxOutputTokens": max_tokens,
                },
            }
            if chat_history:
                for h in chat_history:
                    role = "model" if h.get("role") == "assistant" else "user"
                    payload["contents"].append({"role": role, "parts": [{"text": h.get("content", "")}]})
            payload["contents"].append({"role": "user", "parts": [{"text": user_prompt}]})
            data = json.dumps(payload).encode("utf-8")

            for model_name in self.gemini_models:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent"
                max_retries = 2
                for attempt in range(max_retries + 1):
                    req = urllib.request.Request(
                        url,
                        data=data,
                        headers={
                            "Content-Type": "application/json",
                            "x-goog-api-key": key_state.key
                        },
                        method="POST"
                    )
                    try:
                        with urllib.request.urlopen(req, timeout=30) as resp:
                            resp_data = json.loads(resp.read().decode("utf-8"))
                            if "candidates" in resp_data and len(resp_data["candidates"]) > 0:
                                content = resp_data["candidates"][0]["content"]["parts"][0]["text"]
                                if content and content.strip():
                                    key_state.mark_success()
                                    return content.strip(), f"gemini:{model_name}"
                        break # Success, exit retry loop
                    except urllib.error.HTTPError as exc:
                        err_body = ""
                        try:
                            err_body = exc.read().decode("utf-8")
                        except Exception:
                            pass

                        if exc.code == 429 or "quota" in err_body.lower():
                            if attempt < max_retries:
                                logger.info(f"Gemini 429 Rate Limit. Retrying in 2 seconds (Attempt {attempt+1}/{max_retries})...")
                                time.sleep(2)
                                continue
                            key_state.mark_exhausted(cooldown_seconds=300, reason=f"Gemini 429 Quota Exceeded")
                            break  # Try next key
                        elif exc.code == 404:
                            break  # Try next candidate model
                        else:
                            logger.warning(f"Gemini [{model_name}] HTTP {exc.code}: {err_body[:100]}")
                            break
                    except Exception as exc:
                        logger.warning(f"Gemini [{model_name}] Error: {exc}")
                        break

        return None

    def _call_ollama(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2) -> Optional[Tuple[str, str]]:
        """Call Local Ollama API (via REST API http://localhost:11434)."""
        # 1. Discover active models from Ollama
        candidate_models = [self.ollama_model]
        try:
            req_tags = urllib.request.Request(f"{self.ollama_host}/api/tags")
            with urllib.request.urlopen(req_tags, timeout=3) as resp:
                tags_data = json.loads(resp.read().decode("utf-8"))
                installed = [m["name"] for m in tags_data.get("models", [])]
                if installed:
                    for m in installed:
                        if m not in candidate_models:
                            candidate_models.append(m)
        except Exception:
            pass  # Ollama may not be responding or endpoint busy

        url = f"{self.ollama_host}/api/chat"
        for model_name in candidate_models:
            payload = {
                "model": model_name,
                "messages": self._build_messages(system_prompt, user_prompt, chat_history),
                "stream": False,
                "options": {
                    "temperature": temperature,
                    "num_predict": max_tokens,
                    "num_ctx": 2048,
                    "num_thread": max(1, os.cpu_count() or 4)
                }
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            try:
                with urllib.request.urlopen(req, timeout=60) as resp:
                    resp_data = json.loads(resp.read().decode("utf-8"))
                    msg = resp_data.get("message", {}).get("content", "")
                    if msg and msg.strip():
                        return msg.strip(), f"ollama:{model_name}"
            except Exception as exc:
                logger.warning(f"Ollama [{model_name}] Error: {exc}")
                continue

        return None

    def _call_openai(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2) -> Optional[Tuple[str, str]]:
        """Call generic OpenAI-compatible endpoint."""
        available_keys = [k for k in self.openai_keys if k.is_available]
        if not available_keys:
            return None

        url = f"{self.openai_base}/chat/completions"
        models = ["gpt-4o-mini", "gpt-3.5-turbo"]

        for key_state in available_keys:
            for model_name in models:
                payload = {
                    "model": model_name,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": self._build_messages(system_prompt, user_prompt, chat_history)
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {key_state.key}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        if "choices" in data and len(data["choices"]) > 0:
                            content = data["choices"][0]["message"]["content"]
                            if content and content.strip():
                                key_state.mark_success()
                                return content.strip(), f"openai:{model_name}"
                except urllib.error.HTTPError as exc:
                    if exc.code in (429, 402, 403):
                        key_state.mark_exhausted(300, f"HTTP {exc.code}")
                        break
                    continue
        return None

    def _call_groq(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2) -> Optional[Tuple[str, str]]:
        """Call generic Groq endpoint (OpenAI API compatible)."""
        available_keys = [k for k in self.groq_keys if k.is_available]
        if not available_keys:
            return None

        url = "https://api.groq.com/openai/v1/chat/completions"

        for key_state in available_keys:
            for model_name in self.groq_models:
                payload = {
                    "model": model_name,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": self._build_messages(system_prompt, user_prompt, chat_history)
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {key_state.key}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        if "choices" in data and len(data["choices"]) > 0:
                            content = data["choices"][0]["message"]["content"]
                            if content and content.strip():
                                key_state.mark_success()
                                return content.strip(), f"groq:{model_name}"
                except urllib.error.HTTPError as exc:
                    if exc.code in (429, 402, 403):
                        key_state.mark_exhausted(300, f"HTTP {exc.code}")
                        break
                    continue
        return None

    def _call_groq_stream(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2):
        """Streaming generator for Groq API."""
        available_keys = [k for k in self.groq_keys if k.is_available]
        if not available_keys:
            raise Exception("No available Groq keys")

        url = "https://api.groq.com/openai/v1/chat/completions"
        
        for key_state in available_keys:
            for model_name in self.groq_models:
                payload = {
                    "model": model_name,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": self._build_messages(system_prompt, user_prompt, chat_history),
                    "stream": True
                }
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers={
                        "Authorization": f"Bearer {key_state.key}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                try:
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        for line in resp:
                            if line:
                                decoded_line = line.decode('utf-8').strip()
                                if decoded_line.startswith("data: "):
                                    data_str = decoded_line[6:]
                                    if data_str == "[DONE]":
                                        break
                                    try:
                                        chunk = json.loads(data_str)
                                        if "choices" in chunk and len(chunk["choices"]) > 0:
                                            delta = chunk["choices"][0].get("delta", {})
                                            content = delta.get("content", "")
                                            if content:
                                                yield content
                                    except json.JSONDecodeError:
                                        pass
                        key_state.mark_success()
                        return
                except urllib.error.HTTPError as exc:
                    if exc.code in (429, 402, 403):
                        key_state.mark_exhausted(300, f"HTTP {exc.code}")
                        break
                    continue
                except Exception as exc:
                    logger.warning(f"Groq Stream [{model_name}] Error: {exc}")
                    continue
        raise Exception("All Groq keys or models exhausted for streaming")

    def _call_ollama_stream(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2):
        """Streaming generator for Local Ollama API."""
        url = f"{self.ollama_host}/api/chat"
        payload = {
            "model": self.ollama_model,
            "messages": self._build_messages(system_prompt, user_prompt, chat_history),
            "stream": True,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens,
                "num_ctx": 2048,
                "num_thread": max(1, os.cpu_count() or 4)
            }
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                for line in resp:
                    if line:
                        data = json.loads(line.decode("utf-8"))
                        msg = data.get("message", {}).get("content", "")
                        if msg:
                            yield msg
                        if data.get("done"):
                            break
            return
        except Exception as exc:
            logger.warning(f"Ollama Stream [{self.ollama_model}] Error: {exc}")
            raise exc

    def generate_stream(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2):
        """
        Stream RAG generation. Supports Groq and Ollama.
        Yields text chunks.
        """
        for provider in self.provider_order:
            if provider == "groq" and self.groq_keys:
                try:
                    yield from self._call_groq_stream(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                    return
                except Exception as e:
                    logger.warning(f"Groq Stream failed: {e}, falling back...")

            elif provider == "ollama":
                try:
                    yield from self._call_ollama_stream(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                    return
                except Exception as e:
                    logger.warning(f"Ollama Stream failed: {e}, falling back...")
        
        # Fallback to normal generate if streaming fails or provider doesn't support it yet
        res = self.generate(system_prompt, user_prompt, chat_history, max_tokens, temperature)
        if res:
            yield res[0]

    def generate(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2) -> Optional[Tuple[str, str]]:
        """
        Execute RAG generation across providers following priority order.
        Returns: (answer_text, provider_info_string) or None if all fail.
        """
        for provider in self.provider_order:
            if provider == "openrouter" and self.openrouter_keys:
                res = self._call_openrouter(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                if res:
                    logger.info(f"Generated answer successfully via {res[1]}")
                    return res

            elif provider == "gemini" and self.gemini_keys:
                res = self._call_gemini(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                if res:
                    logger.info(f"Generated answer successfully via {res[1]}")
                    return res
            
            elif provider == "groq" and self.groq_keys:
                res = self._call_groq(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                if res:
                    logger.info(f"Generated answer successfully via {res[1]}")
                    return res

            elif provider == "ollama":
                res = self._call_ollama(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                if res:
                    logger.info(f"Generated answer successfully via {res[1]}")
                    return res

            elif provider == "openai" and self.openai_keys:
                res = self._call_openai(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                if res:
                    logger.info(f"Generated answer successfully via {res[1]}")
                    return res

        logger.error("All configured LLM providers and keys failed or exhausted.")
        return None


# Global Singleton Router Instance
_global_router: Optional[LLMRouter] = None

def get_llm_router() -> LLMRouter:
    global _global_router
    if _global_router is None:
        _global_router = LLMRouter()
    return _global_router
