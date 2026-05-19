from io import BytesIO
import json
import os
import cv2
import numpy as np
import requests
import time
from ultralytics import YOLO
from picamera.array import PiRGBArray
from picamera import PiCamera

#===========Configuration===========
TELEGRAM_API = 0
CHAT_ID = 0

#Cooldown (s) against Spam
last_sent = 0
COOLDOWN = 10 

#===========Image Analysis===========
def is_occluded(frame):
    """Detects whether the camera is obstructed based on brightness, variance, and histogram analysis."""

    if frame is None:
        return False
    
    # Convert image to grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) 

    # Calculate brightness/variance
    brightness = np.mean(gray)
    variance = np.var(gray)

    # Percentage of very dark pixels (0–30) in the overall image
    hist = cv2.calcHist([gray], [0], None, [256], [0,256])
    low_values = np.sum(hist[:30]) / hist.sum()

    # Threshold Values
    return brightness < 70 or variance < 800 or low_values > 0.6

#===========Telegram-Bot===========
def send_alert(photo_bytes, message):
    """Sends an image, message + call to action to Telegram with a cooldown."""

    global last_sent
    now = time.time()

    # Check if cooldown is active
    if now - last_sent < COOLDOWN:
        print("ALERT SPAM PREVENTED")
        return
    
    # Reset the read pointer to the beginning
    photo_bytes.seek(0) 

    url = f"{TELEGRAM_API}/sendPhoto"

    # Inline keyboard with action options (Take action/False alarm)
    keyBoard = {
        "inline_keyboard": [
            [
                {"text": "🚨 Take action", "callback_data": "action"},
                {"text": "❌ False alarm", "callback_data": "ignore"}
            ]
        ]
    }

    # Send a message with an image, timestamp and action options
    requests.post(
        url, 
        data={
            "chat_id": CHAT_ID,
            "caption": f"{message} ({time.strftime('%d.%m.%Y %H:%M:%S')})",
            "reply_markup": json.dumps(keyBoard)
        }, 
        files={
            "photo": photo_bytes})
    
    # Update timestamp
    last_sent = now

def send_message(text):
    """Sends a simple text message for system notifications."""

    url = f"{TELEGRAM_API}/sendMessage"
    requests.post(url, data={"chat_id": CHAT_ID, "text": text})       

#===========Frame-Analysis===========
def analyze_frame(frame, model):
    """Runs YOLO and returns the annotated image."""

    results = model(frame)

    # Annotate the first result and convert it to bytes for Telegram
    annotated = results[0].plot()
    _, buffer = cv2.imencode(".jpg", annotated)
    photo_bytes = BytesIO(buffer.tobytes())

    return results, photo_bytes

#===========Hazard-Analysis===========
def eval_status(frame, model):
    """Determines the status and triggers an alarm if necessary."""

    # First, check for obstructions. Otherwise, false alarms (especially smoke alarms) could occur if the camera is blocked
    if is_occluded(frame):
        _, buffer = cv2.imencode(".jpg", frame)
        photo_bytes = BytesIO(buffer.tobytes())

        send_alert(photo_bytes, "Camera is obstructed!")
        return "Obstructed"
    
    # Perform a YOLO analysis
    results, photo_bytes = analyze_frame(frame, model)

    # No results -> Status OK
    if results[0].boxes is None or len(results[0].boxes) == 0:
        return "OK"

    # Confidence filters and alerts based on class (fire/smoke)
    for box in results[0].boxes:
        cls = int(box.cls[0])
        conf = float(box.conf[0])

        if conf < 0.6:
            continue

        if cls == 0:  # Class 0 = Fire
            send_alert(photo_bytes, "FIRE DETECTED!")
            return "Fire"
        elif cls == 1:  # Class 1 = Smoke
            send_alert(photo_bytes, "Smoke detected!")
            return "Smoke"
        
    return "OK"

#===========System logic===========
def main():
    # Load YOLO model
    model = YOLO("BestModel.pt")

    #PiCamera 
    camera = PiCamera()
    camera.resolution = (320, 240)
    camera.framerate = 32

    raw_capture = PiRGBArray(camera, size=(320, 240))

    send_message("System gestartet und bereit!")

    # Endless loop for continuous image capture and analysis
    for frame in camera.capture_continuous(
        raw_capture,
        format="bgr",   # OpenCV expects the BGR format
        use_video_port=True 
    ):
        # Extract image from frame
        image = frame.array

        # Evaluate the status and trigger an alarm if necessary
        status = eval_status(image, model)

        # Show status on image
        cv2.putText(
            image,
            status,
            (10, 30),
            cv2.FONT_HERSHEY_SIMPLEX,
            1,
            (0, 0, 255),
            2
        )
        cv2.imshow("System", image)

        # Reset frame for next capture
        raw_capture.truncate(0)

        # Press Esc to exit
        if cv2.waitKey(1) == 27:
            send_message("System is shutting down.")
            break
    
    #Free up resources
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
