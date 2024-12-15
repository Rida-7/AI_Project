import cv2
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Conv2D, MaxPooling2D, Dense, Dropout, Flatten
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from sklearn.metrics import classification_report, confusion_matrix
import tensorflow as tf
from tensorflow.keras.callbacks import EarlyStopping

# Initialize image data generator with rescaling and augmentation
train_data_gen = ImageDataGenerator(rescale=1./255, 
                                    rotation_range=20, 
                                    width_shift_range=0.2, 
                                    height_shift_range=0.2, 
                                    shear_range=0.2, 
                                    zoom_range=0.2, 
                                    horizontal_flip=True, 
                                    fill_mode='nearest')

validation_data_gen = ImageDataGenerator(rescale=1./255)

# Preprocess all training images
train_generator = train_data_gen.flow_from_directory(
    'data/train',
    target_size=(48, 48),
    batch_size=64,
    color_mode="grayscale",
    class_mode='categorical')

# Preprocess all validation images
validation_generator = validation_data_gen.flow_from_directory(
    'data/test',
    target_size=(48, 48),
    batch_size=64,
    color_mode="grayscale",
    class_mode='categorical')

# Create model structure
emotion_model = Sequential()

emotion_model.add(Conv2D(32, kernel_size=(3, 3), activation='relu', input_shape=(48, 48, 1)))
emotion_model.add(Conv2D(64, kernel_size=(3, 3), activation='relu'))
emotion_model.add(MaxPooling2D(pool_size=(2, 2)))
emotion_model.add(Dropout(0.25))

emotion_model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
emotion_model.add(MaxPooling2D(pool_size=(2, 2)))
emotion_model.add(Conv2D(128, kernel_size=(3, 3), activation='relu'))
emotion_model.add(MaxPooling2D(pool_size=(2, 2)))
emotion_model.add(Dropout(0.25))

emotion_model.add(Flatten())
emotion_model.add(Dense(1024, activation='relu'))
emotion_model.add(Dropout(0.5))
emotion_model.add(Dense(7, activation='softmax'))

# Learning rate scheduler for decay
lr_schedule = tf.keras.optimizers.schedules.ExponentialDecay(
    initial_learning_rate=0.0001,
    decay_steps=10000,
    decay_rate=0.9,
    staircase=True
)

emotion_model.compile(loss='categorical_crossentropy', 
                      optimizer=Adam(learning_rate=lr_schedule), 
                      metrics=['accuracy'])

# Calculate the number of steps per epoch and validation steps
steps_per_epoch = train_generator.samples // train_generator.batch_size
validation_steps = (validation_generator.samples // validation_generator.batch_size) + 1  # Include the last partial batch

# Define EarlyStopping callback
early_stopping = EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)

# Train the neural network/model
history = emotion_model.fit(
    train_generator,
    steps_per_epoch=steps_per_epoch,
    epochs=100,  # You can adjust this depending on the performance
    validation_data=validation_generator,
    validation_steps=validation_steps,
    callbacks=[early_stopping]  # Add early stopping to avoid overfitting
)

# Save model structure in JSON file
model_json = emotion_model.to_json()
with open("emotion_model.json", "w") as json_file:
    json_file.write(model_json)

# Save trained model weights in .h5 file
emotion_model.save_weights('emotion_model.weights.h5')

# Model Evaluation
# Evaluate the model on the validation set
validation_loss, validation_accuracy = emotion_model.evaluate(validation_generator)
print(f"Validation Loss: {validation_loss}")
print(f"Validation Accuracy: {validation_accuracy}")

# Get the predictions and true labels
validation_generator.reset()
predictions = emotion_model.predict(validation_generator, steps=validation_steps, verbose=1)

# Get predicted class indices
y_pred = np.argmax(predictions, axis=1)

# Get true labels from the generator
y_true = validation_generator.classes

# Ensure that the number of samples are consistent
if len(y_true) == len(y_pred):
    # Classification Report (Precision, Recall, F1 Score)
    report = classification_report(y_true, y_pred, target_names=validation_generator.class_indices.keys())
    print("Classification Report:")
    print(report)

    # Confusion Matrix
    conf_matrix = confusion_matrix(y_true, y_pred)

    # Plot confusion matrix
    plt.figure(figsize=(8, 6))
    sns.heatmap(conf_matrix, annot=True, fmt='d', cmap='Blues', xticklabels=validation_generator.class_indices.keys(), yticklabels=validation_generator.class_indices.keys())
    plt.title('Confusion Matrix')
    plt.xlabel('Predicted Label')
    plt.ylabel('True Label')
    plt.show()

    # Plot accuracy and loss graphs
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5))

    # Accuracy plot
    ax1.plot(history.history['accuracy'], label='Training Accuracy')
    ax1.plot(history.history['val_accuracy'], label='Validation Accuracy')
    ax1.set_title('Model Accuracy')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Accuracy')
    ax1.legend()

    # Loss plot
    ax2.plot(history.history['loss'], label='Training Loss')
    ax2.plot(history.history['val_loss'], label='Validation Loss')
    ax2.set_title('Model Loss')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Loss')
    ax2.legend()

    plt.tight_layout()
    plt.show()

else:
    print(f"Inconsistent number of samples: {len(y_true)} vs {len(y_pred)}")
