# KI-Modell & Objekterkennung

## Vorwort
In diesem Kapitel wird das KI-Modell, welches zur Erkennung von Gefahrenszenarien (Diebstahl, Vandalismus oder Feuer) verwendet wird, trainiert.

Dabei wird das YOLOV11 Modell in der Nanovariante benutzt. 

Zum trainieren wurden Datensätze aus dem Internet sowie eigene Bilder benutzt.

Das Labeln wurde mittels der Software Roboflow durchgeführt.

Hierbei gibt 4 Klassen
Feuer (Feuerzeug) --> Feuer
Maske (FFP2, Sturmhaube) --> Diebstahl
Schere (Küchenschere, Bastelschere) --> Vandalismus
Messer (Küchenmesser, Taschenmesser, Cuttermesser...) --> Vandalismus 

## Eigene Bilder erstellen
1. Video aufnehmen von Objekten
![aksjf](images/roboflow_1.jpg)
2. Roboflow login
3. Neues Projekt erstellen
4. Klassen erstellen
5. Upload der Videos und manuelles Labeling
6. Annotated Bilder dem Datensatz hinzufügen
7. Split nach 70,15,15
8. Preprocessing: 90° Rotation, Helligkeit 20% heller oder dunkler, Imagesize 640x640, Augmentation 2x
9. Export im YOLO11-Format in ZIP
    

