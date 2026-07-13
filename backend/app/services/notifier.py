import logging
import requests
from app.config import settings

logger = logging.getLogger(__name__)

def send_email_via_brevo(to_email: str, to_name: str, subject: str, html_content: str) -> bool:
    if not settings.BREVO_API_KEY:
        logger.warning("[Brevo Notifier] BREVO_API_KEY not configured. Printing email to console instead.")
        print(f"\n=================== EMAIL SIMULATION ===================")
        print(f"To: {to_name} <{to_email}>")
        print(f"Subject: {subject}")
        print(f"Content:\n{html_content}")
        print(f"========================================================\n")
        return True

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": settings.BREVO_API_KEY,
        "content-type": "application/json"
    }
    
    payload = {
        "sender": {
            "name": settings.BREVO_SENDER_NAME,
            "email": settings.BREVO_SENDER_EMAIL
        },
        "to": [
            {
                "email": to_email,
                "name": to_name
            }
        ],
        "subject": subject,
        "htmlContent": html_content
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        if response.status_code in [200, 201, 202]:
            logger.info(f"[Brevo Notifier] Email successfully sent to {to_email}")
            return True
        else:
            logger.error(f"[Brevo Notifier] Failed to send email: {response.status_code} - {response.text}")
            # Fallback output
            print(f"\n[Brevo Fail Fallback] To: {to_name} <{to_email}> | Subject: {subject} | Content: {html_content[:150]}...")
            return False
    except Exception as e:
        logger.exception(f"[Brevo Notifier] Error calling Brevo API: {e}")
        return False

def send_meal_reminder(email: str, name: str, meal_type: str, meal_name: str, protein: float, calories: float, goal: str, items: list) -> bool:
    subject = f"NutriSense: Time for your {meal_type.title()} Meal!"
    
    items_list_html = "".join([f"<li style='padding: 6px 0; border-bottom: 1px solid #f0f0f0; list-style-type: none; font-size: 15px;'>🍲 {item}</li>" for item in items])
    if not items_list_html:
        items_list_html = f"<li style='padding: 6px 0; border-bottom: 1px solid #f0f0f0; list-style-type: none; font-size: 15px;'>🍲 {meal_name}</li>"
        
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>{subject}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f7fafc; margin: 0; padding: 20px; color: #2d3748;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">NutriSense AI Coach</h1>
                <p style="color: #d1fae5; margin: 5px 0 0 0; font-size: 14px;">Your Personalized Nutrition Companion</p>
            </div>
            
            <!-- Body -->
            <div style="padding: 30px;">
                <p style="font-size: 16px; line-height: 1.6; margin-top: 0;">Hello <strong>{name}</strong>,</p>
                <p style="font-size: 16px; line-height: 1.6; color: #4a5568;">It is almost your meal time. Here is your scheduled <strong>{meal_type.title()} Meal</strong> details:</p>
                
                <!-- Meal Box -->
                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin: 20px 0;">
                    <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 18px;">Today's {meal_type.title()} Meal: {meal_name}</h3>
                    <ul style="margin: 0; padding: 0;">
                        {items_list_html}
                    </ul>
                    
                    <div style="display: flex; flex-wrap: wrap; margin-top: 15px; border-top: 1px solid #d1fae5; padding-top: 15px;">
                        <div style="flex: 1; min-width: 100px; margin-bottom: 10px;">
                            <span style="font-size: 12px; color: #047857; text-transform: uppercase; font-weight: bold; display: block;">Protein</span>
                            <strong style="font-size: 18px; color: #065f46;">{protein}g</strong>
                        </div>
                        <div style="flex: 1; min-width: 100px; margin-bottom: 10px;">
                            <span style="font-size: 12px; color: #047857; text-transform: uppercase; font-weight: bold; display: block;">Calories</span>
                            <strong style="font-size: 18px; color: #065f46;">{calories} kcal</strong>
                        </div>
                    </div>
                </div>
                
                <p style="font-size: 16px; line-height: 1.6; color: #2d3748; text-align: center; margin: 25px 0;">
                    Stay consistent and achieve your <strong>{goal}</strong> goal! 🚀
                </p>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="http://localhost:3000/dashboard" style="background-color: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.2);">View Full Recipe & Prep</a>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #edf2f7; font-size: 12px; color: #a0aec0;">
                <p style="margin: 0;">This is an automated notification from your NutriSense AI Assistant.</p>
                <p style="margin: 5px 0 0 0;">&copy; 2026 NutriSense. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    return send_email_via_brevo(email, name, subject, html_content)
