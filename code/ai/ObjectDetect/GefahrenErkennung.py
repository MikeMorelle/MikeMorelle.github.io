from ultralytics import YOLO
import cv2

# Load Model
model = YOLO("best2.pt")

# Open webcam (0 = default camera, 1 = external webcam)
cap = cv2.VideoCapture(1)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # YOLO-Inference
    results = model.predict(frame, conf=0.25, verbose=False)

    # Draw bounding boxes with class labels
    annotated = results[0].plot()

    cv2.imshow("YOLO11 Live", annotated)

    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

cap.release()
cv2.destroyAllWindows()