from io import BytesIO
import json
import os
import cv2
import numpy as np
import requests
import time
from ultralytics import YOLO
from dotenv import load_dotenv

#===========Konfiguration===========
#API-Keys in .env 
load_dotenv()
TELEGRAM_API = os.getenv("TELEGRAM_API")    
CHAT_ID = os.getenv("CHAT_ID")

#Cooldown (s) gegen Spam
last_sent = 0
COOLDOWN = 10 

#===========Bildanalyse===========
def is_occluded(frame):
    """Erkennt, ob die Kamera verdeckt ist, basierend auf Helligkeit, Varianz und Histogramm-Analyse."""

    if frame is None:
        return False
    
    #Bild in Graustufen umwandeln
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) 

    #Helligkeit/Varianz berechnen 
    brightness = np.mean(gray)
    variance = np.var(gray)

    #Anteil der sehr dunklen Pixel (0-30) am Gesamtbild
    hist = cv2.calcHist([gray], [0], None, [256], [0,256])
    low_values = np.sum(hist[:30]) / hist.sum()

    #Schwellenwerte
    return brightness < 70 or variance < 800 or low_values > 0.6

#===========Telegram-Bot===========
def send_alert(photo_bytes, message):
    """Sendet Bild, Nachricht + Handlungsmöglichkeit an Telegram mit Cooldown."""

    global last_sent
    now = time.time()

    #Prüfen, ob Cooldown aktiv ist
    if now - last_sent < COOLDOWN:
        print("ALARM SPAM VERHINDERT")
        return
    
    #Lesezeiger auf Anfang zurücksetzen
    photo_bytes.seek(0) 

    url = f"{TELEGRAM_API}/sendPhoto"

    #Inline-Keyboard mit Handlungsoptionen (Handeln/Fehlalarm)
    keyBoard = {
        "inline_keyboard": [
            [
                {"text": "🚨 Handeln", "callback_data": "action"},
                {"text": "❌ Fehlalarm", "callback_data": "ignore"}
            ]
        ]
    }

    #Sende Nachricht mit Bild, Zeitstempel und Handlungsoptionen 
    requests.post(
        url, 
        data={
            "chat_id": CHAT_ID,
            "caption": f"{message} ({time.strftime('%d.%m.%Y %H:%M:%S')})",
            "reply_markup": json.dumps(keyBoard)
        }, 
        files={
            "photo": photo_bytes})
    
    #Zeitstempel aktualisieren
    last_sent = now

def send_message(text):
    """Sendet einfache Textnachricht für Systemmeldungen."""

    url = f"{TELEGRAM_API}/sendMessage"
    requests.post(url, data={"chat_id": CHAT_ID, "text": text})       

#===========Frame-Analyse===========
def analyze_frame(frame, model):
    """Führt YOLO aus und gibt annotiertes Bild zurück."""

    results = model(frame)

    #erstes Ergebnis annotieren und in Bytes umwandeln für Telegram
    annotated = results[0].plot()
    _, buffer = cv2.imencode(".jpg", annotated)
    photo_bytes = BytesIO(buffer.tobytes())

    return results, photo_bytes

#===========Gefahrenprüfung===========
def eval_status(frame, model):
    """Bestimmt Status und löst ggf. Alarm aus."""
    
    #Zuerst Verdeckung prüfen, da sonst Fehlalarme (insb. Rauch) bei verdeckter Kamera entstehen könnten
    if is_occluded(frame):
        _, buffer = cv2.imencode(".jpg", frame)
        photo_bytes = BytesIO(buffer.tobytes())

        send_alert(photo_bytes, "Kamera ist verdeckt!")
        return "Verdeckt"
    
    #YOLO-Analyse durchführen
    results, photo_bytes = analyze_frame(frame, model)

    #keine Ergebnisse -> Status OK 
    if results[0].boxes is None or len(results[0].boxes) == 0:
        return "OK"

    #Confidence-Filter und Alarmierung basierend auf Klasse (Feuer/Rauch)
    for box in results[0].boxes:
        cls = int(box.cls[0])
        conf = float(box.conf[0])

        if conf < 0.6:
            continue

        if cls == 0:  # Klasse 0 = Feuer
            send_alert(photo_bytes, "ES BRENNT!")
            return "Feuer"
        elif cls == 1:  # Klasse 1 = Rauch
            send_alert(photo_bytes, "Rauch entdeckt!")
            return "Rauch"
        
    return "OK"

#===========Systemlogik===========
def main():
    #YOLO Modell laden 
    model = YOLO("best_nano.pt")

    #0 für interne Kamera, 1 für externe Kamera, PiCamera anders
    cap = cv2.VideoCapture(1)

    if not cap.isOpened():
        print("Kamera konnte nicht geöffnet werden")
        return

    send_message("System gestartet und bereit!")

    #Endlosschleife für kontinuierliche Überwachung
    while True:
        #Frame lesen
        ret, frame = cap.read()
        if not ret:
            print("Frame konnte nicht gelesen werden")
            break

        #Status bestimmen (OK, Feuer, Rauch, Verdeckt) und ggf. Alarm auslösen
        status = eval_status(frame, model)

        #Status auf Frame anzeigen
        cv2.putText(frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        cv2.imshow("System", frame)

        #ESC zum Beenden
        if cv2.waitKey(1) == 27:
            send_message("System wird heruntergefahren.")
            break

    #Ressourcen freigeben
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
