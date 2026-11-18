document.addEventListener("livestock:ready", function () {

    var modal = document.getElementById("vaccinationModal");
    var openButton = document.getElementById("openVaccinationForm");
    var emptyAddButton = document.getElementById("emptyAddVaccination");
    var closeButton = document.getElementById("closeVaccinationForm");
    var cancelButton = document.getElementById("cancelVaccinationForm");

    var form = document.getElementById("vaccinationForm");
    var animalSelect = document.getElementById("vaccinationAnimal");

    var vaccinationList = document.getElementById("vaccinationList");
    var emptyState = document.getElementById("emptyVaccinations");

    var searchInput = document.getElementById("vaccinationSearch");
    var statusFilter = document.getElementById("vaccinationStatusFilter");

    var totalElement = document.getElementById("totalVaccinations");
    var upcomingElement = document.getElementById("upcomingVaccinations");
    var overdueElement = document.getElementById("overdueVaccinations");
    var seasonalElement = document.getElementById("seasonalVaccinations");


    /* =========================================
       CHECK LOGIN
    ========================================= */

    var currentUser = null;

    try {
        currentUser = JSON.parse(
            localStorage.getItem("currentUser")
        );
    } catch (error) {
        currentUser = null;
    }

    /*
       If your current login system uses a different
       localStorage name, we can connect it later.
    */

    if (!currentUser) {
        console.log("No logged-in user found.");
    }


    /* =========================================
       GET ANIMALS
    ========================================= */

    function getAnimals() {

        var animals = [];

        try {

            animals = JSON.parse(
                localStorage.getItem("livestockAnimals")
            );

            if (!Array.isArray(animals)) {
                animals = [];
            }

        } catch (error) {

            animals = [];

        }

        return animals;
    }


    /* =========================================
       GET VACCINATIONS
    ========================================= */

    function getVaccinations() {

        var vaccinations = [];

        try {

            vaccinations = JSON.parse(
                localStorage.getItem("livestockVaccinations")
            );

            if (!Array.isArray(vaccinations)) {
                vaccinations = [];
            }

        } catch (error) {

            vaccinations = [];

        }

        return vaccinations;
    }


    /* =========================================
       SAVE VACCINATIONS
    ========================================= */

    function saveVaccinations(vaccinations) {

        localStorage.setItem(
            "livestockVaccinations",
            JSON.stringify(vaccinations)
        );

    }


    /* =========================================
       TODAY
    ========================================= */

    function getToday() {

        var date = new Date();

        var year = date.getFullYear();

        var month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        var day = String(
            date.getDate()
        ).padStart(2, "0");

        return year + "-" + month + "-" + day;
    }


    /* =========================================
       FORMAT DATE
    ========================================= */

    function formatDate(dateValue) {

        if (!dateValue) {
            return "Not recorded";
        }

        var date = new Date(
            dateValue + "T00:00:00"
        );

        if (isNaN(date.getTime())) {
            return "Not recorded";
        }

        return date.toLocaleDateString(
            "en-ZA",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );
    }


    /* =========================================
       ANIMAL ICON
    ========================================= */

    function getAnimalIcon(type) {

        var animalType = String(
            type || ""
        ).toLowerCase();

        if (
            animalType === "cattle" ||
            animalType === "cow" ||
            animalType === "cows"
        ) {
            return "🐄";
        }

        if (
            animalType === "goat" ||
            animalType === "goats"
        ) {
            return "🐐";
        }

        if (
            animalType === "sheep"
        ) {
            return "🐑";
        }

        if (
            animalType === "pig" ||
            animalType === "pigs"
        ) {
            return "🐖";
        }

        return "🐾";
    }


    /* =========================================
       FIND FARMER'S ANIMALS
    ========================================= */

    function getFarmerAnimals() {

        var animals = getAnimals();

        /*
           If your animals don't currently contain
           farmerId, all animals will be available.
        */

        if (!currentUser || !currentUser.id) {
            return animals;
        }

        var farmerAnimals = animals.filter(
            function (animal) {

                if (!animal.farmerId) {
                    return true;
                }

                return String(
                    animal.farmerId
                ) === String(
                    currentUser.id
                );

            }
        );

        return farmerAnimals;
    }


    /* =========================================
       LOAD ANIMALS
    ========================================= */

    function loadAnimals() {

        if (!animalSelect) {
            return;
        }

        var animals = getFarmerAnimals();

        animalSelect.innerHTML =
            '<option value="">Select animal</option>';

        if (animals.length === 0) {

            animalSelect.innerHTML =
                '<option value="">No animals recorded</option>';

            return;
        }

        animals.forEach(
            function (animal) {

                var option =
                    document.createElement("option");

                option.value = animal.id;

                var animalName =
                    animal.name ||
                    "Unnamed animal";

                var breed =
                    animal.breed ||
                    "Breed not recorded";

                option.textContent =
                    animalName +
                    " - " +
                    breed;

                animalSelect.appendChild(option);

            }
        );
    }


    // Render farmer-provided notes safely inside record cards.
    function escapeHTML(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[ch];
        });
    }

    /* =========================================
       GET STATUS
    ========================================= */

    function getStatus(vaccination) {

        var today = getToday();

        if (!vaccination.nextDate) {
            return "completed";
        }

        if (
            vaccination.nextDate < today
        ) {
            return "overdue";
        }

        return "upcoming";
    }


    /* =========================================
       OPEN MODAL
    ========================================= */

    function openModal() {

        loadAnimals();

        if (modal) {
            modal.classList.add("open");
        }
    }


    /* =========================================
       CLOSE MODAL
    ========================================= */

    function closeModal() {

        if (modal) {
            modal.classList.remove("open");
        }

        if (form) {
            form.reset();
        }
    }


    /* =========================================
       BUTTON EVENTS
    ========================================= */

    if (openButton) {

        openButton.addEventListener(
            "click",
            openModal
        );

    }


    if (emptyAddButton) {

        emptyAddButton.addEventListener(
            "click",
            openModal
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeModal
        );

    }


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeModal
        );

    }


    /* =========================================
       CLOSE MODAL WHEN CLICKING OUTSIDE
    ========================================= */

    if (modal) {

        modal.addEventListener(
            "click",
            function (event) {

                if (event.target === modal) {
                    closeModal();
                }

            }
        );

    }


    /* =========================================
       SAVE VACCINATION
    ========================================= */

    if (form) {

        form.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                var animalId =
                    animalSelect.value;

                var vaccinationName =
                    document.getElementById(
                        "vaccinationName"
                    ).value.trim();

                var vaccinationDate =
                    document.getElementById(
                        "vaccinationDate"
                    ).value;

                var nextDate =
                    document.getElementById(
                        "nextVaccinationDate"
                    ).value;

                var seasonal =
                    document.getElementById(
                        "vaccinationSeasonal"
                    ).value;

                var notes =
                    document.getElementById(
                        "vaccinationNotes"
                    ).value.trim();


                if (!animalId) {

                    alert(
                        "Please select an animal."
                    );

                    return;
                }


                if (!vaccinationName) {

                    alert(
                        "Please enter the vaccination name."
                    );

                    return;
                }


                if (!vaccinationDate) {

                    alert(
                        "Please enter the vaccination date."
                    );

                    return;
                }


                var animals =
                    getFarmerAnimals();

                var selectedAnimal = null;


                animals.forEach(
                    function (animal) {

                        if (
                            String(animal.id) ===
                            String(animalId)
                        ) {
                            selectedAnimal = animal;
                        }

                    }
                );


                if (!selectedAnimal) {

                    alert(
                        "Animal could not be found."
                    );

                    return;
                }


                var vaccinations =
                    getVaccinations();


                var newVaccination = {

                    id: Date.now(),

                    farmerId:
                        currentUser &&
                        currentUser.id
                            ? currentUser.id
                            : null,

                    animalId:
                        selectedAnimal.id,

                    animalName:
                        selectedAnimal.name ||
                        "Unnamed animal",

                    animalType:
                        selectedAnimal.type ||
                        "",

                    vaccinationName:
                        vaccinationName,

                    vaccinationDate:
                        vaccinationDate,

                    nextDate:
                        nextDate,

                    seasonal:
                        seasonal === "yes",

                    notes:
                        notes

                };


                vaccinations.push(
                    newVaccination
                );


                saveVaccinations(
                    vaccinations
                );


                closeModal();

                renderVaccinations();

                updateSummary();


                alert(
                    "Vaccination saved successfully."
                );

            }
        );

    }


    /* =========================================
       CREATE VACCINATION CARD
    ========================================= */

    function createCard(vaccination) {

        var status =
            getStatus(vaccination);

        var statusText =
            "Completed";


        if (status === "upcoming") {
            statusText = "Upcoming";
        }

        if (status === "overdue") {
            statusText = "Overdue";
        }


        var seasonalText = "";


        if (vaccination.seasonal) {

            seasonalText =
                '<span class="meta-tag">' +
                '🌦️ Seasonal' +
                '</span>';

        }


        var nextDateText = "";


        if (vaccination.nextDate) {

            nextDateText =
                '<span class="meta-tag">' +
                'Next: ' +
                formatDate(
                    vaccination.nextDate
                ) +
                '</span>';

        }


        var notesText = "";


        if (vaccination.notes) {

            notesText =
                '<p class="animal-name">' +
                escapeHTML(vaccination.notes) +
                '</p>';

        }


        return (

            '<article class="vaccination-card">' +

                '<div class="vaccination-icon">' +

                    getAnimalIcon(
                        vaccination.animalType
                    ) +

                '</div>' +


                '<div>' +

                    '<h3>' +
                        escapeHTML(vaccination.vaccinationName) +
                    '</h3>' +

                    '<p class="animal-name">' +
                        escapeHTML(vaccination.animalName) +
                    '</p>' +


                    '<div class="vaccination-meta">' +

                        '<span class="meta-tag">' +
                            'Given: ' +
                            formatDate(
                                vaccination.vaccinationDate
                            ) +
                        '</span>' +

                        nextDateText +

                        seasonalText +

                    '</div>' +

                    notesText +

                '</div>' +


                '<div class="vaccination-actions">' +

                    '<div>' +

                        '<span class="' +
                            'status-badge ' +
                            'status-' +
                            status +
                        '">' +

                            statusText +

                        '</span>' +

                    '</div>' +


                    '<button ' +
                        'type="button" ' +
                        'class="delete-vaccination" ' +
                        'data-id="' +
                        escapeHTML(vaccination.id) +
                    '">' +

                        'Delete' +

                    '</button>' +

                '</div>' +

            '</article>'

        );
    }


    /* =========================================
       RENDER
    ========================================= */

    function renderVaccinations() {

        if (!vaccinationList) {
            return;
        }

        var vaccinations =
            getVaccinations();


        var farmerVaccinations =
            [];


        vaccinations.forEach(
            function (vaccination) {

                if (
                    !currentUser ||
                    !currentUser.id ||
                    !vaccination.farmerId ||
                    String(
                        vaccination.farmerId
                    ) === String(
                        currentUser.id
                    )
                ) {

                    farmerVaccinations.push(
                        vaccination
                    );

                }

            }
        );


        var search = "";


        if (searchInput) {

            search =
                searchInput.value
                    .toLowerCase()
                    .trim();

        }


        var filter = "all";


        if (statusFilter) {

            filter =
                statusFilter.value;

        }


        var filtered =
            farmerVaccinations.filter(
                function (vaccination) {

                    var status =
                        getStatus(
                            vaccination
                        );


                    var vaccinationName =
                        String(
                            vaccination.vaccinationName ||
                            ""
                        ).toLowerCase();


                    var animalName =
                        String(
                            vaccination.animalName ||
                            ""
                        ).toLowerCase();


                    var matchesSearch =
                        vaccinationName.indexOf(
                            search
                        ) !== -1 ||
                        animalName.indexOf(
                            search
                        ) !== -1;


                    var matchesFilter =
                        true;


                    if (filter === 'due30') {
                        var today = getToday();
                        var limit = new Date(today + 'T00:00:00');
                        limit.setDate(limit.getDate() + 30);
                        var maxDate = [limit.getFullYear(),
                            String(limit.getMonth()+1).padStart(2,'0'),
                            String(limit.getDate()).padStart(2,'0')].join('-');
                        matchesFilter = !!vaccination.nextDate &&
                            vaccination.nextDate >= today && vaccination.nextDate <= maxDate;
                    } else if (
                        filter === "seasonal"
                    ) {

                        matchesFilter =
                            vaccination.seasonal === true;

                    } else if (
                        filter !== "all"
                    ) {

                        matchesFilter =
                            status === filter;

                    }


                    return (
                        matchesSearch &&
                        matchesFilter
                    );

                }
            );


        if (filtered.length === 0) {

            vaccinationList.innerHTML = "";

            if (emptyState) {
                emptyState.style.display =
                    "block";
            }

            window.dispatchEvent(new Event('lm53:vaccinations-rendered'));
            return;
        }


        if (emptyState) {
            emptyState.style.display =
                "none";
        }


        vaccinationList.innerHTML = "";


        filtered.forEach(
            function (vaccination) {

                vaccinationList.innerHTML +=
                    createCard(
                        vaccination
                    );

            }
        );


        addDeleteEvents();
        window.dispatchEvent(new Event('lm53:vaccinations-rendered'));
    }


    /* =========================================
       DELETE
    ========================================= */

    function addDeleteEvents() {

        var buttons =
            document.querySelectorAll(
                ".delete-vaccination"
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
                            confirm(
                                "Are you sure you want to delete this vaccination?"
                            );


                        if (!confirmed) {
                            return;
                        }


                        var vaccinations =
                            getVaccinations();


                        var remaining =
                            vaccinations.filter(
                                function (vaccination) {

                                    return String(
                                        vaccination.id
                                    ) !== String(id);

                                }
                            );


                        saveVaccinations(
                            remaining
                        );


                        renderVaccinations();

                        updateSummary();

                    }
                );

            }
        );

    }


    /* =========================================
       UPDATE SUMMARY
    ========================================= */

    function updateSummary() {

        var vaccinations =
            getVaccinations();


        var total = 0;

        var upcoming = 0;

        var overdue = 0;

        var seasonal = 0;


        vaccinations.forEach(
            function (vaccination) {

                if (
                    currentUser &&
                    currentUser.id &&
                    vaccination.farmerId &&
                    String(
                        vaccination.farmerId
                    ) !== String(
                        currentUser.id
                    )
                ) {
                    return;
                }


                total++;


                var status =
                    getStatus(
                        vaccination
                    );


                if (
                    status === "upcoming"
                ) {
                    upcoming++;
                }


                if (
                    status === "overdue"
                ) {
                    overdue++;
                }


                if (
                    vaccination.seasonal
                ) {
                    seasonal++;
                }

            }
        );


        if (totalElement) {
            totalElement.textContent =
                total;
        }


        if (upcomingElement) {
            upcomingElement.textContent =
                upcoming;
        }


        if (overdueElement) {
            overdueElement.textContent =
                overdue;
        }


        if (seasonalElement) {
            seasonalElement.textContent =
                seasonal;
        }

    }


    /* =========================================
       SEARCH
    ========================================= */

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            renderVaccinations
        );

    }


    /* =========================================
       FILTER
    ========================================= */

    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            renderVaccinations
        );

    }


    /* =========================================
       START
    ========================================= */

    loadAnimals();

    renderVaccinations();

    updateSummary();

});
