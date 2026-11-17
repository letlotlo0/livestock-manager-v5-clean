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

    var totalAnimals =
        document.getElementById("totalAnimals");

    var cattleTotal =
        document.getElementById("cattleTotal");

    var goatTotal =
        document.getElementById("goatTotal");

    var sheepTotal =
        document.getElementById("sheepTotal");

    var pigTotal =
        document.getElementById("pigTotal");

    var pregnantTotal =
        document.getElementById("pregnantTotal");

    var birthTotal =
        document.getElementById("birthTotal");

    var healthAttention =
        document.getElementById("healthAttention");

    var weightTotal =
        document.getElementById("weightTotal");

    var animalSearch =
        document.getElementById("animalSearch");

    var animalResults =
        document.getElementById("animalResults");

    var noResults =
        document.getElementById("noResults");


    /* =========================
       GET ANIMALS
    ========================== */

    function getAnimals() {

        try {

            var savedAnimals =
                JSON.parse(
                    localStorage.getItem(
                        "livestockAnimals"
                    )
                );

            if (Array.isArray(savedAnimals)) {
                return savedAnimals;
            }

        } catch (error) {

            console.log(
                "Could not read livestock animals."
            );

        }

        return [];

    }


    /* =========================
       GET HEALTH RECORDS
    ========================== */

    function getHealthRecords() {

        try {

            var records =
                JSON.parse(
                    localStorage.getItem(
                        "healthRecords"
                    )
                );

            if (Array.isArray(records)) {
                return records;
            }

        } catch (error) {

            console.log(
                "Could not read health records."
            );

        }

        return [];

    }


    /* =========================
       GET HEALTH STATUSES
    ========================== */

    function getHealthStatuses() {

        try {

            var statuses =
                JSON.parse(
                    localStorage.getItem(
                        "animalHealthStatuses"
                    )
                );

            if (statuses) {
                return statuses;
            }

        } catch (error) {

            console.log(
                "Could not read health statuses."
            );

        }

        return {};

    }


    /* =========================
       ANIMAL TYPE
    ========================== */

    function getAnimalType(animal) {

        var type =
            String(
                animal.type ||
                animal.species ||
                animal.animalType ||
                ""
            ).toLowerCase();


        if (
            type === "cattle" ||
            type === "cow" ||
            type === "bull"
        ) {
            return "cattle";
        }


        if (
            type === "goat"
        ) {
            return "goat";
        }


        if (
            type === "sheep"
        ) {
            return "sheep";
        }


        if (
            type === "pig" ||
            type === "pigs"
        ) {
            return "pig";
        }


        return "";

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
       PREGNANCY CHECK
    ========================== */

    function isPregnant(animal) {

        var value =
            animal.pregnant;

        if (typeof value === "boolean") {
            return value;
        }

        if (
            String(value).toLowerCase() ===
            "yes"
        ) {
            return true;
        }

        if (
            String(value).toLowerCase() ===
            "pregnant"
        ) {
            return true;
        }

        if (
            String(
                animal.status || ""
            ).toLowerCase() ===
            "pregnant"
        ) {
            return true;
        }

        return false;

    }


    /* =========================
       BIRTH CHECK
    ========================== */

    function hasUpcomingBirth(animal) {

        var birthDate =
            animal.expectedBirth ||
            animal.expectedBirthDate ||
            animal.dueDate ||
            animal.birthDate;


        if (!birthDate) {
            return false;
        }


        var date =
            new Date(birthDate);

        var today =
            new Date();


        today.setHours(
            0,
            0,
            0,
            0
        );


        var futureLimit =
            new Date(today);


        futureLimit.setDate(
            futureLimit.getDate() + 60
        );


        return (
            date >= today &&
            date <= futureLimit
        );

    }


    /* =========================
       WEIGHT CHECK
    ========================== */

    function hasWeight(animal) {

        var weight =
            animal.weight ||
            animal.currentWeight ||
            animal.latestWeight;


        if (
            weight === undefined ||
            weight === null ||
            weight === ""
        ) {
            return false;
        }


        return true;

    }


    /* =========================
       CALCULATE STATISTICS
    ========================== */

    function calculateStatistics() {

        var animals =
            getAnimals();

        var statuses =
            getHealthStatuses();


        var cattle =
            0;

        var goats =
            0;

        var sheep =
            0;

        var pigs =
            0;

        var pregnant =
            0;

        var upcomingBirths =
            0;

        var attention =
            0;

        var animalsWithWeight =
            0;


        animals.forEach(
            function (animal) {

                var type =
                    getAnimalType(animal);


                if (type === "cattle") {
                    cattle++;
                }

                if (type === "goat") {
                    goats++;
                }

                if (type === "sheep") {
                    sheep++;
                }

                if (type === "pig") {
                    pigs++;
                }


                if (
                    isPregnant(animal)
                ) {
                    pregnant++;
                }


                if (
                    hasUpcomingBirth(animal)
                ) {
                    upcomingBirths++;
                }


                if (
                    hasWeight(animal)
                ) {
                    animalsWithWeight++;
                }


                var animalStatus =
                    statuses[
                        animal.id
                    ];


                if (
                    animalStatus ===
                        "Sick" ||
                    animalStatus ===
                        "Needs Attention"
                ) {
                    attention++;
                }

            }
        );


        totalAnimals.textContent =
            animals.length;

        cattleTotal.textContent =
            cattle;

        goatTotal.textContent =
            goats;

        sheepTotal.textContent =
            sheep;

        pigTotal.textContent =
            pigs;

        pregnantTotal.textContent =
            pregnant;

        birthTotal.textContent =
            upcomingBirths;

        healthAttention.textContent =
            attention;

        weightTotal.textContent =
            animalsWithWeight;

    }


    /* =========================
       ESCAPE HTML
    ========================== */

    function escapeHTML(value) {

        return String(
            value || ""
        )
            .replace(
                /&/g,
                "&amp;"
            )
            .replace(
                /</g,
                "&lt;"
            )
            .replace(
                />/g,
                "&gt;"
            )
            .replace(
                /"/g,
                "&quot;"
            )
            .replace(
                /'/g,
                "&#039;"
            );

    }


    /* =========================
       SEARCH ANIMALS
    ========================== */

    function searchAnimals() {

        var animals =
            getAnimals();


        var searchTerm =
            animalSearch.value
                .trim()
                .toLowerCase();


        if (searchTerm === "") {

            animalResults.innerHTML =
                "";

            noResults.style.display =
                "none";

            return;

        }


        var results =
            animals.filter(
                function (animal) {

                    var name =
                        String(
                            animal.name || ""
                        ).toLowerCase();

                    var tag =
                        String(
                            animal.tag || ""
                        ).toLowerCase();

                    var breed =
                        String(
                            animal.breed || ""
                        ).toLowerCase();

                    var type =
                        String(
                            animal.type ||
                            animal.species ||
                            ""
                        ).toLowerCase();


                    return (
                        name.indexOf(searchTerm) !== -1 ||
                        tag.indexOf(searchTerm) !== -1 ||
                        breed.indexOf(searchTerm) !== -1 ||
                        type.indexOf(searchTerm) !== -1
                    );

                }
            );


        renderSearchResults(
            results
        );

    }


    /* =========================
       RENDER SEARCH RESULTS
    ========================== */

    function renderSearchResults(
        animals
    ) {

        animalResults.innerHTML =
            "";


        if (animals.length === 0) {

            noResults.style.display =
                "block";

            return;

        }


        noResults.style.display =
            "none";


        animals.forEach(
            function (animal) {

                var type =
                    getAnimalType(
                        animal
                    );


                var card =
                    document.createElement(
                        "div"
                    );


                card.className =
                    "animal-result";


                card.innerHTML =

                    '<div class="result-icon">' +
                        getAnimalIcon(type) +
                    '</div>' +

                    '<div class="result-information">' +

                        '<strong>' +
                            escapeHTML(
                                animal.name ||
                                "Unnamed Animal"
                            ) +
                        '</strong>' +

                        '<span>' +
                            'Tag: ' +
                            escapeHTML(
                                animal.tag ||
                                "Not recorded"
                            ) +
                            ' • ' +
                            escapeHTML(
                                animal.breed ||
                                "Breed not recorded"
                            ) +
                        '</span>' +

                    '</div>' +

                    '<div class="result-type">' +
                        escapeHTML(
                            type ||
                            "Livestock"
                        ) +
                    '</div>';


                animalResults.appendChild(
                    card
                );

            }
        );

    }


    /* =========================
       SEARCH EVENT
    ========================== */

    animalSearch.addEventListener(
        "input",
        searchAnimals
    );


    /* =========================
       START PAGE
    ========================== */

    calculateStatistics();

});
