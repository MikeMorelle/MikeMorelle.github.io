# AI Model & Object Recognition

---

## Table of Contents
- [Foreword](#foreword)
- [Model & Training](#model--training)
- [Detection Classes](#detection-classes)
- [Creating the Dataset](#creating-the-dataset)
- [YOLO11n Training](#yolo11n-training)
- [YOLO 11n Deployment on IMX500 AI Camera (Raspberry Pi Setup)](#yolo-11n-deployment-on-imx500-ai-camera-raspberry-pi-setup)
    - [Prerequisites](#prerequisites)
    - [pt2imx (in Google Colab)](#pt2imx-in-google-colab)
    - [Raspberry Pi Setup](#raspberry-pi-setup-on-the-pi-not-in-colab)
- [YOLO 11n Deployment on Pi AI Hat+ with Hailo-8 Accelerator](#yolo-11n-deployment-on-pi-ai-hat-with-hailo8-accelerator)
    - [Prerequisites](#prerequisite)
    - [.onnx to .hef](#onnx-to-hef)
    - [Raspberry Pi Setup](#raspberry-pi-setup)

---

## Foreword

This manual describes the configuration and setup of an AI-powered detection system based on **YOLOv11** (Nano variant).

---

## Model & Training
In the first step, a custom dataset was created and used to train the model. 
After the initial tests, additional public datasets were incorporated to improve detection accuracy.

The training data was labeled using the software **Roboflow**.

---

## Detection Classes

The model detects four object classes, each corresponding to a specific threat scenario:

| Class      | Example                                    | Scenario    |
|------------|--------------------------------------------|-------------|
| `Fire`     | Lighter                                    | Fire hazard |
| `Mask`     | FFP2 mask, balaclava                       | Theft       |
| `Scissors` | Kitchen scissors, craft scissors           | Vandalism   |
| `Knife`    | Kitchen knife, pocket knife, utility knife | Vandalism   |

---

## Creating the Dataset
1. Record videos of the objects
   - Capture multiple 10-second-clips of the example objects from different angles, various backgrounds, and under different lighting.

2. Roboflow login
   - Create a Roboflow account and log in

3. Create a new project
   - Under the "Projects" tab, create a new project in your workspace.
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_3_1.jpg" alt="Neues Projekt erstellen">

   - In the project configuration, select the project type (Object Detection).
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_3_2.jpg" alt="Art des Projekts auswählen">

4. Create Classes
   - In this project, the classes can be added under the "Classes & Tags" tab.
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_4.jpg" alt="Klassen erstellen">

5. Upload the videos and perform manual labeling
   - Under the "Upload Data" tab, the self-recorded clips can be uploaded.
   During this process, settings for frame extraction, such as the number of frames extracted per second, can be configured.
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_5_1.jpg" alt="Frames aus den aufgenommenen Videos extrahieren">

   - The classes and the resulting labels can then be assigned to the objects using the tools provided by Roboflow.
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_5_2.jpg" alt="Mittels der Roboflowtools die Bounding Boxen erstellen und den Klassen zuweisen">
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_5_3.jpg" alt="Mittels der Roboflowtools die Bounding Boxen erstellen und den Klassen zuweisen">

6. Add the annotated images to the dataset
   - The labeled images are then added to the final dataset in Roboflow, the test dataset contains 692 images.

7. Dataset Split
   - The complete dataset is then split into 70% training data, 15% validation data, and 15% test data.
   <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_7.jpg" alt="Datensatz nach 70/15/15 aufteilen">

8. Preprocessing
   - To increase the size of the dataset, the preprocessing is adjusted:
     - 90° Rotation
     <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_8_1.jpg" alt="Bild um 90° im und gegen den Uhrzeigersinn drehen">
     - Brightness 20% brighter or darker
     <img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_8_2.jpg" alt="Helligkeit auf 20% anpassen">
     - imagesize stretched to 640x640 
     - Augmentation 2x

9. Export in YOLO11 format in ZIP
- This dataset is then exported in the YOLO11 format.

<img src="https://raw.githubusercontent.com/MikeMorelle/MikeMorelle.github.io/main/images/roboflow_9.jpg" alt="Export im YOLO11-Format">

---

## YOLO11n Training

After the training, export the model to the ONNX format, which is required for the AI HAT.

```python
from ultralytics import YOLO

model = YOLO("best.pt")
model.export(format="onnx")
```

This creates the following file:

```text
best.onnx
```

## YOLO 11n Deployment on IMX500 AI Camera (Raspberry PI Setup)

### Prerequisites
- Raspberry Pi 4B (8GB RAM) with a connected Raspberry Pi AI Camera featuring a Sony IMX500 sensor
- Monitor + keyboard, or SSH, VNC, etc. access to the Raspberry Pi (within the same network)
- Trained YOLO model v8n or v11n in .pt format

### pt2imx (in Google Colab)

If you only install Ultralytics (as described in the official documentation: https://docs.ultralytics.com/integrations/sony-imx500#sony-model-compression-toolkit-mct), 
you may spend hours dealing with dependency conflicts, or you might be lucky and find the correct setup.

https://www.reddit.com/r/raspberry_pi/comments/1r2j7le/illegal_instruction_error_with_yolov11_and_rpi4/ THANKS!!!

```
!pip install ultralytics
!pip install torch==2.3.1 torchvision==0.18.1 protobuf==7.35.0
```

Load and export your own YOLO model, this requires some processing time, so it is recommended to reduce the Train, Validation (and optionally Test) datasets and use them as calibration data.
I have had good results with 10 images per dataset, although the log recommends using more than 300 images.

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

Load and Export YOLO

```

from ultralytics import YOLO

model =YOLO("yolo11n.pt")

model.export(
    format="imx", #ai camera Format
    data"content/dataset/data.yaml", #Pfad anpassen und ggf. auch data.yaml
    device=0 #gpu nicht wesentlich, aber etwas schneller
```

Package into ZIP for download and download them from the Files section (left side).

```
import shutil

shutil.make_archive('yolo11n_imx', 'zip', '/content/yolo11n_imx_model')  
```

After the export, the structure is as follows:
```text
yolo11n_imx_model
├── dnnParams.xml
├── labels.txt
├── packerOut.zip
├── model_imx.onnx
├── model_imx_MemoryReport.json
└── model_imx.pbtxt
```

Copy the folder to the Raspberry Pi later when it is needed (e.g., via USB, wget, scp, etc.).

### Raspberry Pi Setup (on the Pi, NOT in Colab)
Install Raspberry Pi OS. **Important**: 64-bit and Bookworm (Legacy) OS Lite for deployment, OS for dev

Update System and Install Firmware

```
sudo apt update && sudo apt full-upgrade -y
sudo apt install imx500-all
```

Optionally enable VNC (for GUI in dev)
```
sudo raspi-config
```
→ Interface Options → VNC Enable

create venv
```
python3 -m venv --system-site-packages imx500-venv #--ssp damit Zugriff auf imx-all und andere globals
source imx500-venv/bin/activate
```

deploy Sony firmware

```
pip install --upgrade pip
pip install git+https://github.com/SonySemiconductorSolutions/aitrios-rpi-application-module-library.git
```

test

```
rpicam-hello --version
```

Problem: libcamera 0.5.x → incompatible with newer modlib versions (libcamera 0.6+ → recommended). Therefore, some additional adjustments are required.

```
pip uninstall modlib -y
pip install modlib==1.1.0
```

Instead of upgrading libcamera, downgrade modlib

Copy model to Pi, e.g. wget with link

```
wget ...
unzip 11n_imx.zip -d 11n_imx_model
```

YOLO Inference Script

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

And put it in there!

```
python3 run_yolo.py
```

## YOLO 11n Deployment on Pi AI Hat+ with Hailo8-Accelerator

### Prerequisite

- Ubuntu 22.04 (or other x86 linux machine)
- trained YOLO Model ("best.pt")
- Raspberry Pi 5 with Hailo-8 or Hailo-8L AI Accelerator

For Windows users using Windows Subsystem for Linux (WSL):
- Display available Linux systems:
````powershell
wsl --list --online
````
- Install Ubuntu 22.04
```powershell
wsl --install -d Ubuntu-22.04
```
- Search and open the Ubuntu 22.04 app, the following may appear:
```bash
username@your-laptop:~$
```
- Update the system
```bash
sudo apt update
```

### .onnx to .hef
Create and activate a virtual environment
```bash
python3 -m venv hailo_env
source hailo_env/bin/activate
```
Check Python version
```bash
python3 --version
```
Install the Hailo Dataflow Compiler from:
https://hailo.ai/developer-zone/software-downloads/?product=ai_accelerators&device=hailo_8_8l
- Depending on the Python version, select the appropriate compiler settings:
  - Accelerators 
  - Hailo-8/8L 
  - AI Software Suite 
  - Dataflow Compiler 
  - x86 
  - Linux 
  - Example: Python 3.10
- Copy the downloaded .whl file to the Linux home directory and install it.
```bash
pip install hailo-dataflow-compiler*.whl
```
- Check Installation
```bash
hailo -h
```

Install Hailo Model Zoo
- for Raspberry Pi 5 with Hailo-8-Accelerator only older versions, like **2.19.0** can be used. Newer versions support Hailo-10 and later.
- Download the repository from: 
https://github.com/hailo-ai/hailo_model_zoo/releases/tag/v2.19.0
- Extract and copy the repository to the home directory, and install it
```bash
cd hailo_model_zoo-2.19.0
pip install -e .
```

Compile ONNX Model
```bash
hailomz compile yolov11n \
    --ckpt best.onnx \
    --hw-arch hailo8 \
    --calib-path train/images \
    --classes 7 \
    --performance
```

| Parameter          | Description                             |
|--------------------|-----------------------------------------|
| `--ckpt`           | ONNX-Modell                             |
| `--hw-arch hailo8` | Target hardware                         |
| `--calib-path`     | Calibration images (64 prepared images) |
| `--classes`        | Number of classes (7 classes)           |
| `--performance`    | Optimization for maximum performance    |

Afterwards:
```
yolov11n.hef
```
fits.

### Raspberry Pi Setup

- Update the system
```bash
sudo apt update
sudo apt upgrade
```

- Enable the PCIe speed:
```bash
sudo raspi-config
```

- Install and verify the Hailo Runtime → Hailo accelerator is detected successfully, the setup is working correctly
```bash
sudo apt install hailo-all
hailortcli fw-control identify
```

- Load the Raspberry Pi example
```bash
git clone https://github.com/hailo-ai/hailo-rpi5-examples.git
cd hailo-rpi5-examples
./install.sh
```

- Navigate to the resources folder and replace the label file
```bash
cd ~/hailo-rpi5-examples/resources
```
- for example
```
my-labels.json
```
- Activate the Python environment
```bash
cd ~/hailo-rpi5-examples
source setup_env.sh
```

- run
```bash
python3 basic_pipelines/detection.py \
    --hef-path resources/best.hef \
    --input rpi \
    --labels-json resources/cytron-labels.json
```
