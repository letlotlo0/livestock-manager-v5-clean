document.addEventListener("livestock:ready", function () {

    /* =====================================
       ELEMENTS
    ====================================== */

    var menuButton =
        document.getElementById("menuButton");

    var navLinks =
        document.getElementById("navLinks");

    var welcomeName =
        document.getElementById("welcomeName");

    var welcomeText =
        document.getElementById("welcomeText");


    /* STATISTICS */

    var totalAnimals =
        document.getElementById("totalAnimals");

    var pregnantAnimals =
        document.getElementById(
            "pregnantAnimals"
        );

    var upcomingBirths =
        document.getElementById(
            "upcomingBirths"
        );

    var growthRecords =
        document.getElementById(
            "growthRecords"
        );


    /* LIVESTOCK */

    var cattleCount =
        document.getElementById(
            "cattleCount"
        );

    var goatCount =
        document.getElementById(
            "goatCount"
        );

    var sheepCount =
        document.getElementById(
            "sheepCount"
        );

    var pigCount =
        document.getElementById(
            "pigCount"
        );


    /* BIRTHS */

    var birthList =
        document.getElementById(
            "birthList"
        );

    var noBirths =
        document.getElementById(
            "noBirths"
        );


    /* =====================================
       MOBILE NAVIGATION
    ====================================== */

    if (menuButton) {

        menuButton.addEventListener(
            "click",
            function () {

                navLinks.classList.toggle(
                    "open"
                );

            }
        );

    }


    /* =====================================
       V2.2 FARM INTELLIGENCE
    ====================================== */
    function renderFarmIntelligence(){
        if(!window.LivestockCore) return;
        var farm=LivestockCore.getFarmScore();
        var actions=LivestockCore.getActionSummary();
        var score=document.getElementById("farmScore");
        if(score) score.textContent=farm.score;
        var band=document.getElementById("farmScoreBand"); if(band) band.textContent=farm.band;
        var advice=document.getElementById("farmScoreAdvice"); if(advice) advice.textContent=(farm.advice&&farm.advice[0])||"Keep your records up to date.";
        ["records","health","breeding","growth"].forEach(function(k){
            var val=Number(farm.components[k]||0); var label=document.getElementById("score"+k.charAt(0).toUpperCase()+k.slice(1)); var bar=document.getElementById("bar"+k.charAt(0).toUpperCase()+k.slice(1));
            if(label) label.textContent=val+"%"; if(bar) bar.style.width=val+"%";
        });
        var uc=document.getElementById("urgentCount"),ac=document.getElementById("attentionCount"),mc=document.getElementById("monitorCount");
        if(uc)uc.textContent=actions.urgent;if(ac)ac.textContent=actions.attention;if(mc)mc.textContent=actions.monitor;
        var list=document.getElementById("dashboardActions"); if(list){list.innerHTML=""; if(!actions.items.length){list.innerHTML='<div class="dashboard-action"><div class="dot"></div><div><strong>No current actions</strong><small>Your farm has no generated alerts right now.</small></div></div>';} else actions.items.forEach(function(x){var el=document.createElement("div");el.className="dashboard-action "+x.priority;el.innerHTML='<div class="dot"></div><div><strong>'+LivestockCore.escapeHTML(x.title)+'</strong><small>'+LivestockCore.escapeHTML(x.text)+'</small></div>';list.appendChild(el);});}
        var ai=LivestockCore.getAnimals().map(function(a){return LivestockCore.getAnimalIntelligence(a);}).sort(function(a,b){return a.score-b.score;});
        var il=document.getElementById("animalIntelligenceList"); if(il){il.innerHTML="";if(!ai.length){il.innerHTML='<div class="dashboard-action"><div class="dot"></div><div><strong>No animals recorded</strong><small>Add livestock to see individual intelligence scores.</small></div></div>';}else ai.slice(0,4).forEach(function(x){var cls=x.score>=80?"high":x.score>=60?"mid":"low";var el=document.createElement("div");el.className="animal-intelligence-row";el.innerHTML='<div><strong>'+LivestockCore.escapeHTML(x.name)+'</strong><small>'+LivestockCore.escapeHTML(x.band)+(x.reasons.length?" • "+LivestockCore.escapeHTML(x.reasons[0]):" • Records look strong")+'</small></div><span class="intelligence-score '+cls+'">'+x.score+'</span>';il.appendChild(el);});}
    }

    renderFarmIntelligence();

    /* =====================================
       CURRENT USER
    ====================================== */

    var currentUser = null;

    try {

        currentUser =
            JSON.parse(
                localStorage.getItem(
                    "currentUser"
                )
            );

    } catch (error) {

        currentUser = null;

    }


    /* =====================================
       PROFILE
    ====================================== */

    function getProfile() {

        var profile = {};

        try {

            profile =
                JSON.parse(
                    localStorage.getItem(
                        "farmerProfile"
                    )
                );

            if (!profile) {

                profile = {};

            }

        } catch (error) {

            profile = {};

        }

        return profile;

    }


    /* =====================================
       DISPLAY WELCOME
    ====================================== */

    function displayWelcome() {

        var profile =
            getProfile();

        var name =
            profile.name ||
            (
                currentUser &&
                currentUser.name
                    ? currentUser.name
                    : "Farmer"
            );


        welcomeName.textContent =
            "Welcome back, " +
            name;


        welcomeText.textContent =
            "Here's what's happening with your livestock today.";

    }


    /* =====================================
       GET ANIMALS
    ====================================== */

    function getAnimals() {

        var animals = [];

        try {

            animals =
                JSON.parse(
                    localStorage.getItem(
                        "livestockAnimals"
                    )
                );

            if (
                !Array.isArray(
                    animals
                )
            ) {

                animals = [];

            }

        } catch (error) {

            animals = [];

        }

        return animals;

    }


    /* =====================================
       FARMER ANIMALS
    ====================================== */

    function getFarmerAnimals() {

        var animals =
            getAnimals();


        if (
            !currentUser ||
            !currentUser.id
        ) {

            return animals;

        }


        return animals.filter(
            function (animal) {

                if (
                    !animal.farmerId
                ) {

                    return true;

                }


                return String(
                    animal.farmerId
                ) ===
                String(
                    currentUser.id
                );

            }
        );

    }


    /* =====================================
       ANIMAL TYPE
    ====================================== */

    function getAnimalType(animal) {

        var type =
            String(
                animal.type ||
                animal.animalType ||
                ""
            ).toLowerCase();


        if (
            type === "cow" ||
            type === "cows" ||
            type === "cattle"
        ) {

            return "cattle";

        }


        if (
            type === "goat" ||
            type === "goats"
        ) {

            return "goat";

        }


        if (
            type === "sheep" ||
            type === "sheeps"
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


    /* =====================================
       LIVESTOCK COUNTS
    ====================================== */

    function updateLivestockCounts(
        animals
    ) {

        var cattle = 0;
        var goats = 0;
        var sheep = 0;
        var pigs = 0;


        animals.forEach(
            function (animal) {

                var type =
                    getAnimalType(
                        animal
                    );


                if (
                    type === "cattle"
                ) {

                    cattle++;

                }


                if (
                    type === "goat"
                ) {

                    goats++;

                }


                if (
                    type === "sheep"
                ) {

                    sheep++;

                }


                if (
                    type === "pig"
                ) {

                    pigs++;

                }

            }
        );


        cattleCount.textContent =
            cattle;

        goatCount.textContent =
            goats;

        sheepCount.textContent =
            sheep;

        pigCount.textContent =
            pigs;


        totalAnimals.textContent =
            animals.length;

    }


    /* =====================================
       PREGNANCY
    ====================================== */

    function isPregnant(animal) {

        var value =
            animal.pregnant;


        if (
            value === true ||
            value === "true"
        ) {

            return true;

        }


        if (
            String(
                value || ""
            ).toLowerCase() ===
            "yes"
        ) {

            return true;

        }


        if (
            animal.pregnancyStatus &&
            String(
                animal.pregnancyStatus
            ).toLowerCase() ===
            "pregnant"
        ) {

            return true;

        }


        return false;

    }


    /* =====================================
       DATE HELPERS
    ====================================== */

    function parseDate(value) {

        if (!value) {

            return null;

        }


        var date =
            new Date(
                value +
                (
                    String(
                        value
                    ).length === 10
                        ? "T00:00:00"
                        : ""
                )
            );


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return null;

        }


        return date;

    }


    function formatDate(value) {

        var date =
            parseDate(
                value
            );


        if (!date) {

            return "Date not set";

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


    /* =====================================
       GET BIRTH DATE
    ====================================== */

    function getBirthDate(animal) {

        var possibleDates = [

            animal.expectedBirthDate,

            animal.expectedBirth,

            animal.birthDueDate,

            animal.dueDate,

            animal.calvingDate,

            animal.kiddingDate,

            animal.farrowingDate

        ];


        for (
            var i = 0;
            i < possibleDates.length;
            i++
        ) {

            if (
                possibleDates[i]
            ) {

                var date =
                    parseDate(
                        possibleDates[i]
                    );


                if (date) {

                    return date;

                }

            }

        }


        return null;

    }


    /* =====================================
       GET UPCOMING BIRTHS
    ====================================== */

    function getUpcomingBirths(
        animals
    ) {

        var today =
            new Date();

        today.setHours(
            0,
            0,
            0,
            0
        );


        var futureLimit =
            new Date(
                today
            );

        futureLimit.setDate(
            futureLimit.getDate() +
            90
        );


        var births = [];


        animals.forEach(
            function (animal) {

                if (
                    !isPregnant(
                        animal
                    )
                ) {

                    return;

                }


                var birthDate =
                    getBirthDate(
                        animal
                    );


                if (!birthDate) {

                    return;

                }


                if (
                    birthDate >= today &&
                    birthDate <= futureLimit
                ) {

                    births.push({

                        animal:
                            animal,

                        date:
                            birthDate

                    });

                }

            }
        );


        births.sort(
            function (a, b) {

                return (
                    a.date -
                    b.date
                );

            }
        );


        return births;

    }


    /* =====================================
       ANIMAL ICON
    ====================================== */

    function getAnimalIcon(
        type
    ) {

        var animalType =
            String(
                type || ""
            ).toLowerCase();


        if (
            animalType === "cattle" ||
            animalType === "cow"
        ) {

            return "🐄";

        }


        if (
            animalType === "goat"
        ) {

            return "🐐";

        }


        if (
            animalType === "sheep"
        ) {

            return "🐑";

        }


        if (
            animalType === "pig"
        ) {

            return "🐖";

        }


        return "🐾";

    }


    /* =====================================
       RENDER BIRTHS
    ====================================== */

    function renderBirths(
        animals
    ) {

        var births =
            getUpcomingBirths(
                animals
            );


        birthList.innerHTML =
            "";


        if (
            births.length === 0
        ) {

            noBirths.style.display =
                "block";

            return;

        }


        noBirths.style.display =
            "none";


        /*
         * Only show the first five
         * upcoming births.
         */

        births
            .slice(0, 5)
            .forEach(
                function (item) {

                    var animal =
                        item.animal;


                    var name =
                        animal.name ||
                        "Unnamed animal";


                    var breed =
                        animal.breed ||
                        "Breed not recorded";


                    var html =

                        '<div class="birth-item">' +

                            '<div class="birth-animal">' +

                                '<div class="birth-icon">' +
                                    getAnimalIcon(
                                        animal.type ||
                                        animal.animalType
                                    ) +
                                '</div>' +

                                '<div>' +

                                    '<strong>' +
                                        name +
                                    '</strong>' +

                                    '<span>' +
                                        breed +
                                    '</span>' +

                                '</div>' +

                            '</div>' +

                            '<div class="birth-date">' +
                                formatDate(
                                    item.date
                                ) +
                            '</div>' +

                        '</div>';


                    birthList.innerHTML +=
                        html;

                }
            );

    }


    /* =====================================
       GROWTH RECORDS
    ====================================== */

    function getGrowthRecords() {

        var records = [];

        try {

            records =
                JSON.parse(
                    localStorage.getItem(
                        "livestockGrowth"
                    )
                );

            if (
                !Array.isArray(
                    records
                )
            ) {

                records = [];

            }

        } catch (error) {

            records = [];

        }


        return records;

    }


    function updateGrowthCount() {

        var records =
            getGrowthRecords();


        if (
            currentUser &&
            currentUser.id
        ) {

            records =
                records.filter(
                    function (record) {

                        if (
                            !record.farmerId
                        ) {

                            return true;

                        }


                        return String(
                            record.farmerId
                        ) ===
                        String(
                            currentUser.id
                        );

                    }
                );

        }


        growthRecords.textContent =
            records.length;

    }


    /* =====================================
       UPDATE DASHBOARD
    ====================================== */

    function updateDashboard() {

        var animals =
            getFarmerAnimals();


        updateLivestockCounts(
            animals
        );


        var pregnantCount =
            0;


        animals.forEach(
            function (animal) {

                if (
                    isPregnant(
                        animal
                    )
                ) {

                    pregnantCount++;

                }

            }
        );


        pregnantAnimals.textContent =
            pregnantCount;


        var births =
            getUpcomingBirths(
                animals
            );


        upcomingBirths.textContent =
            births.length;


        renderBirths(
            animals
        );


        updateGrowthCount();

    }


    /* =====================================
       START
    ====================================== */

    displayWelcome();

    updateDashboard();

});
