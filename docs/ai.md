# KI-Modell & Objekterkennung

## Inhaltsverzeichnis
- [Vorwort](#vorwort)
- [Modell & Training](#modell--training)
- [Erkennungsklassen](#erkennungsklassen)
- [Datensatz erstellen](#datensatz-erstellen)
- [YOLO11n Training](#yolo11n-training)
- [YOLO 11n Deployment auf IMX500 AI Camera (Raspberry PI Setup)](#yolo-11n-deployment-auf-imx500-ai-camera-raspberry-pi-setup)
    - [Voraussetzungen](#voraussetzungen)
    - [pt2imx (in Google Colab)](#pt2imx-in-google-colab)
    - [Raspberry Pi Setup](#raspberry-pi-setup-aufm-pi-nicht-in-colab)

---

## Vorwort

Dieses Handbuch beschreibt die Konfiguration und Einrichtung eines KI-gestützten Erkennungssystems auf Basis von **YOLOv11** (Nanovariante).

---

## Modell & Training

Im ersten Schritt wurde ein eigener Datensatz erstellt und trainiert. 
Nach den ersten Tests wurden zusätzlich öffentliche Datensätze eingebunden, um die Erkennungsgenauigkeit zu verbessern.

Das Labeln der Trainingsdaten erfolgte mit der Software **Roboflow**.

---

## Erkennungsklassen

Das Modell erkennt vier Objektklassen, denen jeweils ein Bedrohungsszenario zugeordnet ist:

| Klasse   | Beispiele                                 | Szenario    |
|----------|-------------------------------------------|-------------|
| `Feuer`  | Feuerzeug                                 | Brandgefahr |
| `Maske`  | FFP2-Maske, Sturmhaube                    | Diebstahl   |
| `Schere` | Küchenschere, Bastelschere                | Vandalismus |
| `Messer` | Küchenmesser, Taschenmesser, Cuttermesser | Vandalismus |

---

## Datensatz erstellen
1. Videos aufnehmen von Objekten
   - Aufnahme von mehreren 10-Sekunden-Clips von den Beispielobjekten aus unterschiedlichen Winkeln, Hintergründen und Belichtungen 

2. Roboflow login
   - Konto bei Roboflow erstellen und einloggen

3. Neues Projekt erstellen
   - unter dem Reiter "Projects" ein neues Projekt im Workspace erstellen 
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_3_1.jpg" alt="Neues Projekt erstellen">

   - in der Projektkonfiguration die Art des Projekts (Object Detection) auswählen
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_3_2.jpg" alt="Art des Projekts auswählen">

4. Klassen erstellen
   - in diesem Projekt können unter dem Reiter "Classes & Tags" die Klassen hinzugefügt werden 
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_4.jpg" alt="Klassen erstellen">

5. Upload der Videos und manuelles Labeling
   - unter dem Reiter "Upload Data" können die selbst gefilmten Clips hochgeladen werden. 
   Hierbei können Einstellungen zur Extraktion von Frames pro Sekunde extrahiert werden
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_5_1.jpg" alt="Frames aus den aufgenommenen Videos extrahieren">

   - die Klassen und die daraus resultierenden Labels können dann mittels Tools von Roboflow den Objekten zugeordnet werden
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_5_2.jpg" alt="Mittels der Roboflowtools die Bounding Boxen erstellen und den Klassen zuweisen">
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_5_3.jpg" alt="Mittels der Roboflowtools die Bounding Boxen erstellen und den Klassen zuweisen">

6. Annotated Bilder dem Datensatz hinzufügen
   - die gelabelten Bilder werden anschließend dem finalen Datensatz in Roboflow hinzugefügt, der Testdatensatz enthält 692 Bilder

7. Datensatzsplit
   - der vollständige Datensatz wird anschließend in 70 % Training, 15 % Validierung und 15 % Test Daten geteilt
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_7.jpg" alt="Datensatz nach 70/15/15 aufteilen">

8. Preprocessing
   - um den Datensatz zu erhöhen, wird das Preprocessing angepasst:
     - 90° Rotation
     <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_8_1.jpg" alt="Bild um 90° im und gegen den Uhrzeigersinn drehen">
     - Helligkeit 20% heller oder dunkler
     <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_8_2.jpg" alt="Helligkeit auf 20% anpassen">
     - Imagesize auf 640x640 streched
     - Augmentation 2x

9. Export im YOLO11-Format in ZIP
- dieser Datensatz wird dann im YOLO11-Format exportiert

<img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_9.jpg" alt="Export im YOLO11-Format">

---

## YOLO11n Training

## YOLO 11n Deployment auf IMX500 AI Camera (Raspberry PI Setup)

### Voraussetzungen
- Raspberry Pi 4B (8GB RAM) mit angeschlossener Raspberry Pi AI Camera mit Sony IMX500 Sensor
- Monitor + Tastatur oder ssh, vnc,... Zugriff auf Rasp Pi (im gleichen Netzwerk)
- trainiertes YOLO Modell v8n oder 11n im .pt Format

### pt2imx (in Google Colab)

Installiert man nur ultralytics (wie in offizieller Doc: https://docs.ultralytics.com/integrations/sony-imx500#sony-model-compression-toolkit-mct), dann kann man sich stundenlang mit Konflikten rumschlagen oder man hat Glück und findet den Segen

https://www.reddit.com/r/raspberry_pi/comments/1r2j7le/illegal_instruction_error_with_yolov11_and_rpi4/ DANKE!!!

```
!pip install ultralytics
!pip install torch==2.3.1 torchvision==0.18.1 protobuf==7.35.0
```

Eigenes YOLO Modell laden und exportieren … brauch nen Stück, deshalb am besten die Datensätze Train, Val (und optional test) verkleinern und als Kalibrierungsdaten dazugeben. Ich habe gute Erfahrungen mit 10 Bildern pro Datensatz gemacht, log empfiehlt >300

```
import os
import random
import shutil

path = "/content/dataset/data"  #Pfad anpassen

splits = ["train", "val", "test"]

keep_images = 10

for split in splits:
    split_path = os.path.join(path, split)

    if not os.path.exists(split_path):
        print(f"Skip: {split}")
        continue

    for class_name in os.listdir(split_path):
        class_path = os.path.join(split_path, class_name)

        if not os.path.isdir(class_path):
            continue

        images = [
            f for f in os.listdir(class_path)
            if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp", ".gif"))
        ]

        random.shuffle(images)

        remove_images = images[keep_images:]

        for img in remove_images:
            img_path = os.path.join(class_path, img)
            os.remove(img_path)

        print(f"{split}/{class_name}: kept {min(len(images), keep_images)} images")

print("Datensatz verkleinert.")
```

YOLO laden und export

```

from ultralytics import YOLO

model =YOLO("yolo11n.pt")

model.export(
    format="imx", #ai camera Format
    data"content/dataset/data.yaml", #Pfad anpassen und ggf. auch data.yaml
    device=0 #gpu nicht wesentlich, aber etwas schneller
```

Zum Download in zip verpacken und anschließend aus Dateien (links) Herunterladen

```
import shutil

shutil.make_archive('yolo11n_imx', 'zip', '/content/yolo11n_imx_model')  
```

Nach dem Export folgende Struktur:
```text
yolo11n_imx_model
├── dnnParams.xml
├── labels.txt
├── packerOut.zip
├── model_imx.onnx
├── model_imx_MemoryReport.json
└── model_imx.pbtxt
```
kopiere den Ordner später auf den Pi, wenn wir ihn brauchen (z. B. via USB, wget, scp, ...)

### Raspberry Pi Setup (aufm Pi, NICHT in Colab)
Raspberry Pi OS installieren. WICHTIG: 64-bit und Bookworm (legacy) OS Lite für deploy, OS für dev

System aktualisieren und Firmware installieren

```
sudo apt update && sudo apt full-upgrade -y
sudo apt install imx500-all
```

Optional vnc aktivieren, für GUI im dev)
```
sudo raspi-config
```
→ Interface Options → VNC Enable

erstelle venv
```
python3 -m venv --system-site-packages imx500-venv #--ssp damit Zugriff auf imx-all und andere globals
source imx500-venv/bin/activate
```

deploy Sony firmware

```
pip install --upgrade pip
pip install git+https://github.com/SonySemiconductorSolutions/aitrios-rpi-application-module-library.git
```

teste

```
rpicam-hello --version
```

Problem: libcamera 0.5.x → inkompatibel mit neueren modlib-Versionen (libcamera 0.6+ → empfohlen), deshalb müssen wir etwas tricksen

```
pip uninstall modlib -y
pip install modlib==1.1.0
```

statt libcam hoch, modlib runter

Modell auf Pi kopieren z. B. wget mit Link

```
wget ...
unzip 11n_imx.zip -d 11n_imx_model
```

YOLO Inferenzscript

```
class YOLO(Model):

    def __init__(self):
        super().__init__(
            model_file="11n_imx_model/packerOut.zip",
            model_type=MODEL_TYPE.CONVERTED,
            color_format=COLOR_FORMAT.RGB,
            preserve_aspect_ratio=False,
        )

        self.labels = np.genfromtxt(
            "11n_imx_model/labels.txt",
            dtype=str,
            delimiter="\n",
        )

    def post_process(self, output_tensors):
        return pp_od_yolo_ultralytics(output_tensors)


device = AiCamera(frame_rate=16)  #eventuell auf 8 runter
model = YOLO()
device.deploy(model)

annotator = Annotator()

with device as stream:
    for frame in stream:

        detections = frame.detections[
            frame.detections.confidence > 0.55
        ]

        labels = [
            f"{model.labels[class_id]}: {score:.2f}"
            for _, score, class_id, _ in detections
        ]

        annotator.annotate_boxes(
            frame,
            detections,
            labels=labels,
            alpha=0.3,
            corner_radius=10,
        )

        frame.display()
```

Und rein da!

```
python3 run_yolo.py
```




        


