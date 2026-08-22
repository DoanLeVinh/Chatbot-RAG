import re

with open("C:/TTTN/Chatbot-RAG/backend/llm_router.py", "r", encoding="utf-8") as f:
    content = f.read()

# Insert _call_openrouter_stream
openrouter_stream_code = """
    def _call_openrouter_stream(self, system_prompt: str, user_prompt: str, chat_history: list = None, max_tokens: int = 3000, temperature: float = 0.2):
        \"\"\"Streaming generator for OpenRouter API.\"\"\"
        available_keys = [k for k in self.openrouter_keys if k.is_available]
        if not available_keys:
            if self.openrouter_keys:
                oldest = min(self.openrouter_keys, key=lambda k: k.cooldown_until)
                oldest.cooldown_until = 0
                available_keys = [oldest]
            else:
                raise Exception("No available OpenRouter keys")

        url = "https://openrouter.ai/api/v1/chat/completions"
        
        for key_state in available_keys:
            for model_name in self.openrouter_models:
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
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "LogiChat RAG"
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
                    logger.warning(f"OpenRouter Stream [{model_name}] Error: {exc}")
                    continue
        raise Exception("All OpenRouter keys or models exhausted for streaming")

"""

content = content.replace('    def _call_gemini(self, system_prompt: str', openrouter_stream_code + '    def _call_gemini(self, system_prompt: str')

# Update generate_stream
old_generate_stream = """
            if provider == "groq" and self.groq_keys:
                try:
                    yield from self._call_groq_stream(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                    return
                except Exception as e:
                    logger.warning(f"Groq Stream failed: {e}, falling back...")

            elif provider == "ollama":
"""

new_generate_stream = """
            if provider == "groq" and self.groq_keys:
                try:
                    yield from self._call_groq_stream(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                    return
                except Exception as e:
                    logger.warning(f"Groq Stream failed: {e}, falling back...")

            elif provider == "openrouter" and self.openrouter_keys:
                try:
                    yield from self._call_openrouter_stream(system_prompt, user_prompt, chat_history, max_tokens, temperature)
                    return
                except Exception as e:
                    logger.warning(f"OpenRouter Stream failed: {e}, falling back...")

            elif provider == "ollama":
"""
content = content.replace(old_generate_stream, new_generate_stream)

with open("C:/TTTN/Chatbot-RAG/backend/llm_router.py", "w", encoding="utf-8") as f:
    f.write(content)

print("patched")
