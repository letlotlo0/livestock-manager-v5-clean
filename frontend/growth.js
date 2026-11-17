document.addEventListener("livestock:ready", function () {


    /* =========================
       NAVIGATION
    ========================== */

    var menuButton =
        document.getElementById("menuButton");

    var navLinks =
        document.getElementById("navLinks");


    menuButton.addEventListener(
        "click",
        function () {

            navLinks.classList.toggle("open");

        }
    );


    /* =========================
       ELEMENTS
    ========================== */

    var addWeightButton =
        document.getElementById("addWeightButton");

    var emptyAddButton =
        document.getElementById("emptyAddButton");

    var animalFilter =
        document.getElementById("animalFilter");

    var selectedAnimalName =
        document.getElementById("selectedAnimalName");

    var selectedAnimalBreed =
        document.getElementById("selectedAnimalBreed");

    var currentWeight =
        document.getElementById("currentWeight");

    var weightGain =
        document.getElementById("weightGain");

    var averageWeight =
        document.getElementById("averageWeight");

    var recordTotal =
        document.getElementById("recordTotal");

    var growthPercentage =
        document.getElementById("growthPercentage");

    var growthChange =
        document.getElementById("growthChange");

    var progressBar =
        document.getElementById("progressBar");

    var startingWeight =
        document.getElementById("startingWeight");

    var latestWeight =
        document.getElementById("latestWeight");

    var recordsList =
        document.getElementById("recordsList");

    var emptyState =
        document.getElementById("emptyState");

    var historyCount =
        document.getElementById("historyCount");

    var modal =
        document.getElementById("weightModal");

    var closeModal =
        document.getElementById("closeModal");

    var cancelButton =
        document.getElementById("cancelButton");

    var form =
        document.getElementById("weightForm");

    var animalSelect =
        document.getElementById("animalSelect");

    var weightDate =
        document.getElementById("weightDate");

    var weightValue =
        document.getElementById("weightValue");

    var weightNotes =
        document.getElementById("weightNotes");


    /* =========================
       LOCAL STORAGE
    ========================== */

    function getAnimals() {

        try {

            var animals =
                JSON.parse(
                    localStorage.getItem(
                        "livestockAnimals"
                    )
                );

            if (Array.isArray(animals)) {

                return animals;

            }

        } catch (error) {

            return [];

        }

        return [];

    }


    function getWeightRecords() {

        try {

            var records =
                JSON.parse(
                    localStorage.getItem(
                        "growthRecords"
                    )
                );

            if (Array.isArray(records)) {

                return records;

            }

        } catch (error) {

            return [];

        }

        return [];

    }


    function saveWeightRecords(records) {

        localStorage.setItem(
            "growthRecords",
            JSON.stringify(records)
        );

    }


    /* =========================
       ANIMAL ICON
    ========================== */

    function getAnimalIcon(type) {

        if (type === "cattle") {
            return "🐄";
        }

        if (type === "goat") {
            return "🐐";
        }

        if (type === "sheep") {
            return "🐑";
        }

        if (type === "pig") {
            return "🐖";
        }

        return "🐾";

    }


    /* =========================
       POPULATE ANIMALS
    ========================== */

    function populateAnimals() {

        var animals = getAnimals();

        animalFilter.innerHTML =
            '<option value="">Select animal</option>';

        animalSelect.innerHTML =
            '<option value="">Select animal</option>';


        animals.forEach(function (animal) {

            var label =
                (animal.name || "Unnamed") +
                " — " +
                (animal.tag || "No ID");


            var filterOption =
                document.createElement("option");

            filterOption.value =
                animal.id;

            filterOption.textContent =
                label;

            animalFilter.appendChild(
                filterOption
            );


            var formOption =
                document.createElement("option");

            formOption.value =
                animal.id;

            formOption.textContent =
                label;

            animalSelect.appendChild(
                formOption
            );

        });


        var selectedAnimalId =
            localStorage.getItem(
                "selectedAnimalId"
            );


        if (selectedAnimalId) {

            animalFilter.value =
                selectedAnimalId;

            animalSelect.value =
                selectedAnimalId;

        }

    }


    /* =========================
       FIND ANIMAL
    ========================== */

    function findAnimal(id) {

        var animals = getAnimals();

        return animals.find(function (animal) {

            return String(animal.id) ===
                String(id);

        });

    }


    /* =========================
       FORMAT DATE
    ========================== */

    function formatDate(date) {

        if (!date) {
            return "Not recorded";
        }

        var parts =
            date.split("-");

        if (parts.length !== 3) {
            return date;
        }

        return (
            parts[2] +
            "/" +
            parts[1] +
            "/" +
            parts[0]
        );

    }


    /* =========================
       ESCAPE HTML
    ========================== */

    function escapeHTML(value) {

        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");

    }


    /* =========================
       OPEN MODAL
    ========================== */

    function openModal() {

        populateAnimals();

        var selectedId =
            animalFilter.value;

        if (selectedId) {

            animalSelect.value =
                selectedId;

        }


        modal.classList.add("open");

    }


    /* =========================
       CLOSE MODAL
    ========================== */

    function closeWeightModal() {

        modal.classList.remove("open");

        form.reset();

    }


    addWeightButton.addEventListener(
        "click",
        openModal
    );


    emptyAddButton.addEventListener(
        "click",
        openModal
    );


    closeModal.addEventListener(
        "click",
        closeWeightModal
    );


    cancelButton.addEventListener(
        "click",
        closeWeightModal
    );


    modal.addEventListener(
        "click",
        function (event) {

            if (event.target === modal) {

                closeWeightModal();

            }

        }
    );


    /* =========================
       ANIMAL FILTER
    ========================== */

    animalFilter.addEventListener(
        "change",
        function () {

            var id =
                animalFilter.value;


            if (id) {

                localStorage.setItem(
                    "selectedAnimalId",
                    id
                );

                animalSelect.value =
                    id;

            }


            renderGrowth();

        }
    );


    /* =========================
       FORM SUBMIT
    ========================== */

    form.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            var animalId =
                animalSelect.value;


            var weight =
                parseFloat(
                    weightValue.value
                );


            if (!animalId) {

                window.alert(
                    "Please select an animal."
                );

                return;

            }


            if (
                isNaN(weight) ||
                weight <= 0
            ) {

                window.alert(
                    "Please enter a valid weight."
                );

                return;

            }


            var records =
                getWeightRecords();


            records.push({

                id:
                    Date.now().toString(),

                animalId:
                    animalId,

                date:
                    weightDate.value,

                weight:
                    weight,

                notes:
                    weightNotes.value.trim(),

                createdAt:
                    new Date().toISOString()

            });


            saveWeightRecords(
                records
            );


            localStorage.setItem(
                "selectedAnimalId",
                animalId
            );


            animalFilter.value =
                animalId;


            closeWeightModal();

            renderGrowth();

        }
    );


    /* =========================
       CALCULATE GROWTH
    ========================== */

    function calculateGrowth(records) {

        if (records.length === 0) {

            return {

                startingWeight: 0,
                latestWeight: 0,
                gain: 0,
                percentage: 0,
                average: 0

            };

        }


        var sorted =
            records.slice().sort(
                function (a, b) {

                    return new Date(a.date) -
                        new Date(b.date);

                }
            );


        var first =
            Number(
                sorted[0].weight
            );


        var latest =
            Number(
                sorted[sorted.length - 1].weight
            );


        var gain =
            latest - first;


        var percentage = 0;


        if (first > 0) {

            percentage =
                (gain / first) * 100;

        }


        var total = 0;


        records.forEach(
            function (record) {

                total +=
                    Number(record.weight);

            }
        );


        var average =
            total / records.length;


        return {

            startingWeight:
                first,

            latestWeight:
                latest,

            gain:
                gain,

            percentage:
                percentage,

            average:
                average

        };

    }


    /* =========================
       UPDATE ANIMAL INFO
    ========================== */

    function updateAnimalInfo() {

        var id =
            animalFilter.value;


        if (!id) {

            selectedAnimalName.textContent =
                "No animal selected";

            selectedAnimalBreed.textContent =
                "Select an animal to view its growth.";

            return;

        }


        var animal =
            findAnimal(id);


        if (!animal) {

            selectedAnimalName.textContent =
                "Animal not found";

            selectedAnimalBreed.textContent =
                "";

            return;

        }


        selectedAnimalName.textContent =
            animal.name ||
            "Unnamed Animal";


        selectedAnimalBreed.textContent =
            getAnimalIcon(animal.type) +
            " " +
            (
                animal.breed ||
                "Breed not recorded"
            );

    }


    /* =========================
       RENDER GROWTH
    ========================== */

    function renderGrowth() {

        updateAnimalInfo();


        var selectedId =
            animalFilter.value;


        if (!selectedId) {

            currentWeight.textContent =
                "0 kg";

            weightGain.textContent =
                "0 kg";

            averageWeight.textContent =
                "0 kg";

            recordTotal.textContent =
                "0";

            growthPercentage.textContent =
                "0%";

            growthChange.textContent =
                "0 kg";

            progressBar.style.width =
                "0%";

            startingWeight.textContent =
                "Starting: 0 kg";

            latestWeight.textContent =
                "Latest: 0 kg";

            recordsList.innerHTML =
                "";

            recordsList.style.display =
                "none";

            emptyState.style.display =
                "block";

            historyCount.textContent =
                "0 records";

            return;

        }


        var allRecords =
            getWeightRecords();


        var records =
            allRecords.filter(
                function (record) {

                    return String(
                        record.animalId
                    ) === String(
                        selectedId
                    );

                }
            );


        records.sort(
            function (a, b) {

                return new Date(b.date) -
                    new Date(a.date);

            }
        );


        historyCount.textContent =
            records.length +
            (
                records.length === 1
                    ? " record"
                    : " records"
            );


        recordTotal.textContent =
            records.length;


        if (records.length === 0) {

            currentWeight.textContent =
                "0 kg";

            weightGain.textContent =
                "0 kg";

            averageWeight.textContent =
                "0 kg";

            growthPercentage.textContent =
                "0%";

            growthChange.textContent =
                "0 kg";

            progressBar.style.width =
                "0%";

            startingWeight.textContent =
                "Starting: 0 kg";

            latestWeight.textContent =
                "Latest: 0 kg";

            recordsList.innerHTML =
                "";

            recordsList.style.display =
                "none";

            emptyState.style.display =
                "block";

            return;

        }


        recordsList.style.display =
            "flex";

        emptyState.style.display =
            "none";


        var growth =
            calculateGrowth(records);


        currentWeight.textContent =
            growth.latestWeight.toFixed(1) +
            " kg";


        weightGain.textContent =
            (
                growth.gain >= 0
                    ? "+"
                    : ""
            ) +
            growth.gain.toFixed(1) +
            " kg";


        averageWeight.textContent =
            growth.average.toFixed(1) +
            " kg";


        growthPercentage.textContent =
            (
                growth.percentage >= 0
                    ? "+"
                    : ""
            ) +
            growth.percentage.toFixed(1) +
            "%";


        growthChange.textContent =
            (
                growth.gain >= 0
                    ? "+"
                    : ""
            ) +
            growth.gain.toFixed(1) +
            " kg";


        var progress =
            growth.percentage;


        if (progress < 0) {
            progress = 0;
        }

        if (progress > 100) {
            progress = 100;
        }


        progressBar.style.width =
            progress + "%";


        startingWeight.textContent =
            "Starting: " +
            growth.startingWeight.toFixed(1) +
            " kg";


        latestWeight.textContent =
            "Latest: " +
            growth.latestWeight.toFixed(1) +
            " kg";


        renderRecords(records);

    }


    /* =========================
       RENDER RECORDS
    ========================== */

    function renderRecords(records) {

        recordsList.innerHTML =
            "";


        records.forEach(
            function (record) {

                var animal =
                    findAnimal(
                        record.animalId
                    );


                if (!animal) {
                    return;
                }


                var card =
                    document.createElement(
                        "article"
                    );


                card.className =
                    "weight-record";


                card.innerHTML =

                    '<div class="weight-date">' +

                        '<span>DATE</span>' +

                        '<strong>' +
                            formatDate(
                                record.date
                            ) +
                        '</strong>' +

                    '</div>' +


                    '<div class="weight-main">' +

                        '<h3>' +
                            escapeHTML(
                                animal.name ||
                                "Unnamed Animal"
                            ) +
                        '</h3>' +

                        '<p>' +
                            escapeHTML(
                                record.notes ||
                                "Weight recorded"
                            ) +
                        '</p>' +

                    '</div>' +


                    '<div class="weight-value">' +

                        '<span>WEIGHT</span>' +

                        '<strong>' +
                            Number(
                                record.weight
                            ).toFixed(1) +
                            ' kg' +
                        '</strong>' +

                    '</div>' +


                    '<button ' +
                        'type="button" ' +
                        'class="delete-weight" ' +
                        'data-id="' +
                            record.id +
                        '">' +
                        'Delete' +
                    '</button>';


                recordsList.appendChild(
                    card
                );

            }
        );


        attachDeleteButtons();

    }


    /* =========================
       DELETE RECORD
    ========================== */

    function attachDeleteButtons() {

        var buttons =
            document.querySelectorAll(
                ".delete-weight"
            );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        var id =
                            button.getAttribute(
                                "data-id"
                            );


                        var confirmed =
                            window.confirm(
                                "Delete this weight record?"
                            );


                        if (!confirmed) {
                            return;
                        }


                        var records =
                            getWeightRecords();


                        records =
                            records.filter(
                                function (record) {

                                    return String(
                                        record.id
                                    ) !== String(
                                        id
                                    );

                                }
                            );


                        saveWeightRecords(
                            records
                        );


                        renderGrowth();

                    }
                );

            }
        );

    }


    /* =========================
       TODAY'S DATE
    ========================== */

    function setToday() {

        var today =
            new Date();


        var year =
            today.getFullYear();


        var month =
            String(
                today.getMonth() + 1
            ).padStart(2, "0");


        var day =
            String(
                today.getDate()
            ).padStart(2, "0");


        weightDate.value =
            year +
            "-" +
            month +
            "-" +
            day;

    }


    /* =========================
       START
    ========================== */

    populateAnimals();

    setToday();

    renderGrowth();

});
