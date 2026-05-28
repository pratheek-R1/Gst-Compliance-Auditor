import json
from google import genai
from typing import Dict, List, Any

def get_batch_insights(mismatches_list: List[Dict[str, Any]], api_key: str) -> Dict[str, str]:
    """
    Calls the Gemini API (using the new google-genai SDK) to get explanations for a batch of mismatches.
    """
    if not mismatches_list:
        return {}
    
    if not api_key or api_key == "your_api_key_here":
        return {m["invoice_no"]: "AI analysis unavailable (Missing API Key)" for m in mismatches_list}

    try:
        client = genai.Client(api_key=api_key)
        
        prompt = f"""
        You are an expert Indian Chartered Accountant specializing in GST reconciliation.
        Analyze the following batch of {len(mismatches_list)} invoice mismatches between a company's Purchase Register and GSTR-2A.

        For each mismatch, provide:
        1. Root Cause Analysis: A very brief (1 sentence) likely cause based on standard accounting errors.
        2. Actionable Advice: Exactly what the accountant should do next (e.g., "Draft email to supplier", "Check physical invoice", "Reverse ITC").

        Input Data:
        {json.dumps(mismatches_list, indent=2)}

        IMPORTANT: You MUST respond with ONLY a valid JSON object. Do not include markdown formatting like ```json.
        The JSON must be a dictionary where the keys are the EXACT 'invoice_no' strings from the input, 
        and the values are strings containing your advice (Root Cause + Actionable Advice).

        Example Format:
        {{
            "INV-001": "Root Cause: Supplier likely filed GSTR-1 late. Action: Wait for next month's GSTR-2B before claiming ITC.",
            "INV-002": "Root Cause: Tax amount differs. Action: Request supplier to issue a Credit/Debit note to rectify the difference."
        }}
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        response_text = response.text.strip()
        
        # Clean up potential markdown formatting from the response
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]
            
        ai_insights = json.loads(response_text.strip())
        return ai_insights
        
    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        # Fallback if AI fails
        return {m["invoice_no"]: f"AI analysis failed: {str(e)}" for m in mismatches_list}


def get_chat_response(question: str, context: List[Dict[str, Any]], api_key: str) -> str:
    """
    Calls the Gemini API (using the new google-genai SDK) for the /ai-chat endpoint.
    """
    if not api_key or api_key == "your_api_key_here":
        return "AI Chat unavailable: API Key missing."

    try:
        client = genai.Client(api_key=api_key)
        prompt = f"""
        You are an expert Indian Chartered Accountant assisting a user with their GST compliance and reconciliation.
        
        CONTEXT (User's Current Mismatches):
        {json.dumps(context, indent=2) if context else 'No specific context provided.'}
        
        USER'S QUESTION: 
        "{question}"
        
        INSTRUCTIONS FOR YOUR RESPONSE:
        1. Read the USER'S QUESTION carefully and answer ONLY what is asked.
        2. If the user asks for a general explanation (e.g., "Ledger Reconciliation" or "Section 17(5)"), explain the concept professionally and concisely.
        3. Do NOT draft an email to a vendor UNLESS the user explicitly asks for an email, a draft, or a notice.
        4. If the user asks what to do about a specific mismatch or blocked credit, provide explicit remediation steps (e.g., exactly which table in GSTR-3B to adjust).
        5. Keep your response highly actionable, professional, and directly related to the USER'S QUESTION.
        """
        
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt
        )
        return response.text.strip()
    except Exception as e:
        return f"Error generating response: {str(e)}"
