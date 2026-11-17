document.addEventListener("livestock:ready", function () {

    /* =========================
       NAVIGATION
    ========================== */

    var menuButton = document.getElementById("menuButton");
    var navLinks = document.getElementById("navLinks");

    if (menuButton && navLinks) {

        menuButton.addEventListener("click", function () {
            navLinks.classList.toggle("open");
        });

    }


    /* =========================
       PAGE ELEMENTS
    ========================== */

    var totalAnimals =
        document.getElementById("totalAnimals");

    var weightRecords =
        document.getElementById("weightRecords");

    var birthRecords =
        document.getElementById("birthRecords");

    var healthRecords =
        document.getElementById("healthRecords");

    var cattleCount =
        document.getElementById("cattleCount");

    var goatCount =
        document.getElementById("goatCount");

    var sheepCount =
        document.getElementById("sheepCount");

    var pigCount =
        document.getElementById("pigCount");


    /* =========================
       READ ANIMALS
    ========================== */

    function getAnimals() {

        try {

            var savedAnimals =
                JSON.parse(
                    localStorage.getItem("livestockAnimals")
                );

            if (Array.isArray(savedAnimals)) {
                return savedAnimals;
            }

        } catch (error) {

            console.log(
                "Unable to read livestock records."
            );

        }

        return [];

    }


    /* =========================
       READ RECORDS
    ========================== */

    function getRecords(key) {

        try {

            var savedRecords =
                JSON.parse(
                    localStorage.getItem(key)
                );

            if (Array.isArray(savedRecords)) {
                return savedRecords;
            }

        } catch (error) {

            console.log(
                "Unable to read " + key
            );

        }

        return [];

    }


    /* =========================
       GET ANIMAL TYPE
    ========================== */

    function getAnimalType(animal) {

        var type = String(
            animal.type ||
            animal.species ||
            animal.animalType ||
            ""
        ).toLowerCase().trim();


        if (
            type === "cattle" ||
            type === "cow" ||
            type === "bull"
        ) {
            return "cattle";
        }


        if (type === "goat") {
            return "goat";
        }


        if (type === "sheep") {
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
       COUNT WEIGHTS
    ========================== */

    function countWeightRecords(animals) {

        var count = 0;


        animals.forEach(function (animal) {

            var weight =
                animal.weight ||
                animal.currentWeight ||
                animal.latestWeight;


            if (
                weight !== undefined &&
                weight !== null &&
                weight !== ""
            ) {
                count++;
            }

        });


        return count;

    }


    /* =========================
       COUNT BIRTH RECORDS
    ========================== */

    function countBirthRecords(animals) {

        var count = 0;


        animals.forEach(function (animal) {

            var birthDate =
                animal.birthDate ||
                animal.dateOfBirth ||
                animal.expectedBirth ||
                animal.expectedBirthDate ||
                animal.dueDate;


            if (
                birthDate !== undefined &&
                birthDate !== null &&
                birthDate !== ""
            ) {
                count++;
            }

        });


        return count;

    }


    /* =========================
       COUNT LIVESTOCK
    ========================== */

    function calculateLivestockCounts(animals) {

        var cattle = 0;
        var goats = 0;
        var sheep = 0;
        var pigs = 0;


        animals.forEach(function (animal) {

            var type = getAnimalType(animal);


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

        });


        return {
            cattle: cattle,
            goats: goats,
            sheep: sheep,
            pigs: pigs
        };

    }


    /* =========================
       UPDATE PAGE
    ========================== */

    function updateReports() {

        var animals = getAnimals();

        var weights = getRecords(
            "weightRecords"
        );

        var births = getRecords(
            "birthRecords"
        );

        var health = getRecords(
            "healthRecords"
        );


        var counts =
            calculateLivestockCounts(
                animals
            );


        /* TOTAL */

        if (totalAnimals) {

            totalAnimals.textContent =
                animals.length;

        }


        /* LIVESTOCK TYPES */

        if (cattleCount) {

            cattleCount.textContent =
                counts.cattle;

        }


        if (goatCount) {

            goatCount.textContent =
                counts.goats;

        }


        if (sheepCount) {

            sheepCount.textContent =
                counts.sheep;

        }


        if (pigCount) {

            pigCount.textContent =
                counts.pigs;

        }


        /* WEIGHT RECORDS */

        if (weightRecords) {

            if (weights.length > 0) {

                weightRecords.textContent =
                    weights.length;

            } else {

                weightRecords.textContent =
                    countWeightRecords(animals);

            }

        }


        /* BIRTH RECORDS */

        if (birthRecords) {

            if (births.length > 0) {

                birthRecords.textContent =
                    births.length;

            } else {

                birthRecords.textContent =
                    countBirthRecords(animals);

            }

        }


        /* HEALTH RECORDS */

        if (healthRecords) {

            healthRecords.textContent =
                health.length;

        }

    }


    /* =========================
       LOAD REPORTS
    ========================== */

    updateReports();

});
