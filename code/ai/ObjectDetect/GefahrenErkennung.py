from ultralytics import YOLO
import cv2

# Modell laden
model = YOLO("best2.pt")

# Webcam öffnen (0 = Standardkamera, 1 = externe Webcam)
cap = cv2.VideoCapture(1)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # YOLO-Inferenz
    results = model.predict(frame, conf=0.25, verbose=False)

    # Bounding Boxes + Klassen einzeichnen
    annotated = results[0].plot()

    cv2.imshow("YOLO11 Live", annotated)

    # Mit 'q' beenden
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()