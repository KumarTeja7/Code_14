"use strict";
class Workout {
    date = new Date();
    id = (Date.now() + "").slice(-10);
    clicks = 0;
    constructor(coords, distance, duration){
        // this.date = ...
        // this.id = ...
        this.coords = coords; // [lat, lng]
        this.distance = distance; // in km
        this.duration = duration; // in min
    }
    _setDescription() {
        // prettier-ignore
        const months = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December"
        ];
        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`;
    }
    click() {
        this.clicks++;
    }
}
class Running extends Workout {
    type = "running";
    constructor(coords, distance, duration, cadence){
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this._setDescription();
    }
    calcPace() {
        // min/km
        this.pace = this.duration / this.distance;
        return this.pace;
    }
}
class Cycling extends Workout {
    type = "cycling";
    constructor(coords, distance, duration, elevationGain){
        super(coords, distance, duration);
        this.elevationGain = elevationGain;
        // this.type = 'cycling';
        this.calcSpeed();
        this._setDescription();
    }
    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60);
        return this.speed;
    }
}
// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);
///////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".form__input--type");
const inputDistance = document.querySelector(".form__input--distance");
const inputDuration = document.querySelector(".form__input--duration");
const inputCadence = document.querySelector(".form__input--cadence");
const inputElevation = document.querySelector(".form__input--elevation");
const closeformbtn = document.getElementById("delete");
const DeleteAllWorkouts = document.getElementById("DeleteALL");
class App {
    #map;
    #mapZoomLevel = 13;
    #mapEvent;
    #workouts = [];
    #mapLayers = [];
    constructor(){
        // Get user's position
        this._getPosition();
        // Get data from local storage
        this._getLocalStorage();
        // Attach event handlers
        form.addEventListener("submit", this._newWorkout.bind(this));
        inputType.addEventListener("change", this._toggleElevationField);
        containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
        closeformbtn.addEventListener("click", this._hideForm.bind(this));
        debugger;
        document.addEventListener("DOMContentLoaded", ()=>{
            debugger;
            const deleteEle = document.querySelectorAll("#deletebtn");
            deleteEle.forEach((x)=>{
                x.addEventListener("click", this._DeleteWorkout.bind(this));
            });
        });
    }
    _getPosition() {
        if (navigator.geolocation) navigator.geolocation.getCurrentPosition(this._loadMap.bind(this), function() {
            alert("Could not get your position");
        });
    }
    _loadMap(position) {
        const { latitude } = position.coords;
        const { longitude } = position.coords;
        // console.log(`https://www.google.pt/maps/@${latitude},${longitude}`);
        const coords = [
            latitude,
            longitude
        ];
        this.#map = L.map("map").setView(coords, this.#mapZoomLevel);
        L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);
        // Handling clicks on map
        this.#map.on("click", this._showForm.bind(this));
        this.#workouts.forEach((work)=>{
            this._renderWorkoutMarker(work);
        });
    }
    _showForm(mapE) {
        this.#mapEvent = mapE;
        form.classList.remove("hidden");
        inputDistance.focus();
    }
    _hideForm() {
        debugger;
        // Empty inputs
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = "";
        form.style.display = "none";
        form.classList.add("hidden");
        setTimeout(()=>form.style.display = "grid", 1000);
    }
    _toggleElevationField() {
        inputElevation.closest(".form__row").classList.toggle("form__row--hidden");
        inputCadence.closest(".form__row").classList.toggle("form__row--hidden");
    }
    _newWorkout(e) {
        const validInputs = (...inputs)=>inputs.every((inp)=>Number.isFinite(inp));
        const allPositive = (...inputs)=>inputs.every((inp)=>inp > 0);
        e.preventDefault();
        // Get data from form
        const type = inputType.value;
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const { lat, lng } = this.#mapEvent.latlng;
        let workout;
        // If workout running, create running object
        if (type === "running") {
            const cadence = +inputCadence.value;
            // Check if data is valid
            if (// !Number.isFinite(distance) ||
            // !Number.isFinite(duration) ||
            // !Number.isFinite(cadence)
            !validInputs(distance, duration, cadence) || !allPositive(distance, duration, cadence)) return alert("Inputs have to be positive numbers!");
            workout = new Running([
                lat,
                lng
            ], distance, duration, cadence);
        }
        // If workout cycling, create cycling object
        if (type === "cycling") {
            const elevation = +inputElevation.value;
            if (!validInputs(distance, duration, elevation) || !allPositive(distance, duration)) return alert("Inputs have to be positive numbers!");
            workout = new Cycling([
                lat,
                lng
            ], distance, duration, elevation);
        }
        // Add new object to workout array
        this.#workouts.push(workout);
        // Render workout on map as marker
        this._renderWorkoutMarker(workout);
        // Render workout on list
        this._renderWorkout(workout);
        // Hide form + clear input fields
        this._hideForm();
        // Set local storage to all workouts
        this._setLocalStorage();
    }
    _renderWorkoutMarker(workout) {
        const Marker = L.marker(workout.coords).addTo(this.#map).bindPopup(L.popup({
            maxWidth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
            riseOnHover: true
        })).setPopupContent(`${workout.type === "running" ? "\uD83C\uDFC3\u200D\u2642\uFE0F" : "\uD83D\uDEB4\u200D\u2640\uFE0F"} ${workout.description}`).openPopup();
        this.#mapLayers.push(Marker);
    }
    _renderWorkout(workout) {
        let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description} </h2> 
        <div class="workout__details">
          <span class="workout__icon">${workout.type === "running" ? "\uD83C\uDFC3\u200D\u2642\uFE0F" : "\uD83D\uDEB4\u200D\u2640\uFE0F"}</span>
          <span class="workout__value">${workout.distance}</span>
          <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">\u{23F1}</span>
          <span class="workout__value">${workout.duration}</span>
          <span class="workout__unit">min</span>
        </div>
    `;
        if (workout.type === "running") html += `
        <div class="workout__details">
          <span class="workout__icon">\u{26A1}\u{FE0F}</span>
          <span class="workout__value">${workout.pace.toFixed(1)}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">\u{1F9B6}\u{1F3FC}</span>
          <span class="workout__value">${workout.cadence}</span>
          <span class="workout__unit">spm</span>
        </div>
      </li>
      <span class="material-icons" value="${workout.id}" id="deletebtn">close</span>
      `;
        if (workout.type === "cycling") html += `
        <div class="workout__details">
          <span class="workout__icon">\u{26A1}\u{FE0F}</span>
          <span class="workout__value">${workout.speed.toFixed(1)}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">\u{26F0}</span>
          <span class="workout__value">${workout.elevationGain}</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      <span class="material-icons" value="${workout.id}" id="deletebtn">close</span>
      `;
        form.insertAdjacentHTML("afterend", html);
    }
    _moveToPopup(e) {
        // BUGFIX: When we click on a workout before the map has loaded, we get an error. But there is an easy fix:
        if (!this.#map) return;
        const workoutEl = e.target.closest(".workout");
        if (!workoutEl) return;
        const workout = this.#workouts.find((work)=>work.id === workoutEl.dataset.id);
        this.#map.flyTo(workout.coords, this.#mapZoomLevel, {
            animate: true,
            pan: {
                duration: 25
            }
        });
    // using the public interface
    // workout.click();
    }
    _setLocalStorage() {
        localStorage.setItem("workouts", JSON.stringify(this.#workouts));
    }
    _getLocalStorage() {
        const data = JSON.parse(localStorage.getItem("workouts"));
        if (!data) return;
        this.#workouts = data;
        this.#workouts.forEach((work)=>{
            this._renderWorkout(work);
        });
    }
    _DeleteWorkout(e) {
        debugger;
        let lat1 = "";
        let lng1 = "";
        const liElements = containerWorkouts.querySelectorAll("li");
        for(let i = 0; i < liElements.length; i++)if (Number(liElements[i].attributes["data-id"].value) === Number(e.target["attributes"].value.value)) liElements[i].remove();
        this.#workouts.find((p, index)=>{
            if (Number(p.id) === Number(e.target.attributes.value.value)) {
                lat1 = this.#workouts[index].coords[0];
                lng1 = this.#workouts[index].coords[1];
                this.#workouts.splice(index, 1);
            }
        });
        let latlng = {
            lat: lat1,
            lng: lng1
        };
        let currentmarker;
        this.#mapLayers.forEach((p)=>{
            if (p._latlng["lat"] == latlng["lat"] && p._latlng["lng"] == latlng["lng"]) currentmarker = p;
        });
        //this.showToasterMessage(`deleted successfully`);
        currentmarker.remove();
        localStorage.removeItem("workouts");
        this._setLocalStorage();
    }
    reset() {
        localStorage.removeItem("workouts");
        location.reload();
    }
}
const app = new App();

//# sourceMappingURL=index.672d4772.js.map
