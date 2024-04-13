## UGV Control Interface Documentation

### **Introduction**

This documentation provides an overview and usage guide for the UGV (Unmanned Ground Vehicle) Control Interface. This interface allows users to visualize and control the UGV's movement on a digital map, manage waypoints, and control the engine.

---

### **Project Setup**

#### **Initialize Vue 3 Application**

The project is built using Vue 3 incorporating HTML, CSS, and TypeScript.

#### **Map Integration**

We use Leaflet, a leading open-source JavaScript library for mobile-friendly interactive maps. The map displays the UGV's location and any saved waypoints.

---

### **Interface Components**

#### **Map Display**

The map is rendered using Leaflet and initialized with a predefined starting point, representing the UGV's initial location.

#### **Saved Waypoints List**

This section displays a list of saved waypoints. Each waypoint shows its name, latitude, and longitude. Users can interact with each waypoint using buttons for actions like deleting, renaming, and driving to the waypoint.

#### **Engine Control**

A control button at the top right corner toggles the UGV's engine on or off. When the engine is off, the UGV cannot be moved using the keyboard controls.

---

### **Functionalities**

#### **Maneuvering the UGV**

Users can control the UGV's movement using the keyboard arrow keys:

- **Move UGV forward**: `ArrowUp`
- **Move UGV backward**: `ArrowDown`
- **Move UGV left**: `ArrowLeft`
- **Move UGV right**: `ArrowRight`

#### **Waypoint Management**

- **Drive**: Sets the UGV's location to the selected waypoint.
- **Save**: Saves a new waypoint to the list.
- **Discard**: Cancels the waypoint creation.
- **Delete**: Removes a saved waypoint from the list.
- **Rename**: Allows renaming a saved waypoint.

#### **Contextual Menu**

Right-clicking on the map displays a contextual menu with options to create a waypoint (long pressing for touch devices).

---

### **Engine Status Notification**

When attempting to move the UGV with the engine off, a popup notification advises the user to start the engine.

---

### **Testing**

Thorough testing has been conducted to ensure all functionalities work seamlessly. All features have been verified to be bug-free.

For a detailed demonstration of the interface and its capabilities, refer to the attached screen recording.

---

### **Installation and Setup**

1. Clone the repository.
2. Navigate to the project directory (`cd ugv-prototype`).
3. Install dependencies with `npm install`.
4. Run the application with `npm run dev`.

---


### **Contributors**

- [Elina Otchenko](https://github.com/ell0tchenko)


---
