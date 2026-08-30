import os
import json
import urllib.request
import urllib.error
import logging
from typing import List, Dict, Any, Tuple
from dotenv import load_dotenv
from .tools import AVAILABLE_TOOLS_SCHEMA, TOOL_DISPATCH_MAP

load_dotenv()
logger = logging.getLogger(__name__)

class AgentDispatcher:
    """
    Agentic framework for routing queries between Tools and RAG.
    """
    def __init__(self, rag_pipeline):
        self.rag_pipeline = rag_pipeline
        self.tools_schema = AVAILABLE_TOOLS_SCHEMA

    def _call_llm_with_tools(self, messages: List[Dict[str, Any]], tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calls OpenRouter API with tool support."""
        # Lấy list key từ env (hỗ trợ cả OPENROUTER_API_KEY và OPENROUTER_API_KEYS)
        keys_str = os.getenv("OPENROUTER_API_KEYS") or os.getenv("OPENROUTER_API_KEY") or ""
        keys = [k.strip().strip('"').strip("'") for k in keys_str.split(",") if k.strip().strip('"').strip("'")]
        if not keys:
            raise ValueError("No OpenRouter keys available.")
            
        url = "https://openrouter.ai/api/v1/chat/completions"
        data = {
            "model": "meta-llama/llama-3.1-8b-instruct",
            "messages": messages,
            "tools": tools,
            "tool_choice": "auto",
            "temperature": 0.1
        }
        
        headers = {
            "Authorization": f"Bearer {keys[0]}",
            "Content-Type": "application/json"
        }
        
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                result = json.loads(response.read().decode("utf-8"))
                return result["choices"][0]["message"]
        except Exception as e:
            logger.error(f"[AGENT] OpenRouter API Error: {str(e)}")
            raise e

    def process_request(self, 
                        query: str, 
                        ai_model: str = "logi_fast", 
                        chat_history: List[Dict[str, str]] = None) -> Tuple[str, List[Dict[str, Any]], str]:
        """
        Executes a Tool Calling Loop.
        1. Asks LLM if any tool is needed for the query.
        2. If a tool is called, executes the Python function and feeds result back to LLM.
        3. If no tool is called, falls back to standard RAG pipeline.
        """
        system_prompt = (
            "Bạn là trợ lý AI Hải quan. "
            "Bạn có quyền truy cập vào các công cụ (tools) tra cứu mã HS và Tỷ giá. "
            "Nếu câu hỏi yêu cầu tra cứu mã HS hoặc tỷ giá, HÃY GỌI TOOL. "
            "Nếu không, hãy trả lời bình thường."
        )

        history_msgs = chat_history[-6:] if chat_history else []
        messages = [{"role": "system", "content": system_prompt}] + history_msgs + [{"role": "user", "content": query}]

        # 1. Ask LLM to determine intent / tool calling
        try:
            logger.info(f"[AGENT] Invoking LLM for intent check: {query}")
            response_msg = self._call_llm_with_tools(messages, self.tools_schema)
            
            tool_calls = response_msg.get("tool_calls")
            
            # 2. Tool Calling Execution
            if tool_calls:
                logger.info(f"[AGENT] LLM requested tool calls: {len(tool_calls)}")
                messages.append(response_msg) # append assistant message with tool calls
                
                for tool_call in tool_calls:
                    function_name = tool_call["function"]["name"]
                    arguments = json.loads(tool_call["function"]["arguments"])
                    logger.info(f"[AGENT] Executing tool: {function_name}({arguments})")
                    
                    if function_name in TOOL_DISPATCH_MAP:
                        # Call Python function
                        tool_result = TOOL_DISPATCH_MAP[function_name](**arguments)
                        
                        # Feed result back to messages
                        messages.append({
                            "role": "tool",
                            "name": function_name,
                            "content": tool_result,
                            "tool_call_id": tool_call["id"]
                        })
                    else:
                        messages.append({
                            "role": "tool",
                            "name": function_name,
                            "content": json.dumps({"error": "Tool not found"}),
                            "tool_call_id": tool_call["id"]
                        })
                
                # Ask LLM to summarize tool results
                logger.info("[AGENT] Synthesizing final answer from tool results...")
                # Remove tools to force it to answer now
                final_msg = self._call_llm_with_tools(messages, None)
                
                # Tools used, no specific RAG document sources
                return final_msg.get("content", ""), [], "Agent-Tool"
            
            # 3. No Tool Called -> Fallback to RAG Pipeline
            logger.info("[AGENT] No tool called. Falling back to RAG Pipeline.")
            return self.rag_pipeline.chat(query, ai_model, chat_history)

        except Exception as e:
            logger.error(f"[AGENT] Error in Agent loop: {str(e)}")
            # Fallback to pure RAG if tool routing fails
            return self.rag_pipeline.chat(query, ai_model, chat_history)
