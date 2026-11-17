document.addEventListener("livestock:ready", function () {

    /* =========================
       MOBILE NAVIGATION
    ========================== */

    var menuButton =
        document.getElementById("menuButton");

    var navLinks =
        document.getElementById("navLinks");


    if (menuButton && navLinks) {

        menuButton.addEventListener(
            "click",
            function () {

                navLinks.classList.toggle("open");

            }
        );

    }


    /* =========================
       LOCAL STORAGE
    ========================== */

    function getAnimals() {

        try {

            var data =
                JSON.parse(
                    localStorage.getItem(
                        "livestockAnimals"
                    )
                );


            if (Array.isArray(data)) {

                return data;

            }

        } catch (error) {

            console.log(
                "Unable to load animal data."
            );

        }

        return [];

    }


    function getSoldAnimals() {

        try {

            var data =
                JSON.parse(
                    localStorage.getItem(
                        "soldLivestock"
                    )
                );


            if (Array.isArray(data)) {

                return data;

            }

        } catch (error) {

            console.log(
                "Unable to load sold animal data."
            );

        }

        return [];

    }


    /* =========================
       MONEY FORMAT
    ========================== */

    function formatMoney(amount) {

        return (
            "R" +
            (Number(amount) || 0)
                .toLocaleString(
                    "en-ZA",
                    {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                    }
                )
        );

    }


    /* =========================
       GET DATA
    ========================== */

    var animals =
        getAnimals();

    var soldAnimals =
        getSoldAnimals();


    /* =========================
       TOTAL ACTIVE ANIMALS
    ========================== */

    var totalAnimals =
        document.getElementById(
            "totalAnimals"
        );


    if (totalAnimals) {

        totalAnimals.textContent =
            animals.length;

    }


    /* =========================
       PREGNANT ANIMALS
    ========================== */

    var pregnantAnimals =
        document.getElementById(
            "pregnantAnimals"
        );


    var pregnantCount =
        animals.filter(
            function (animal) {

                return (
                    String(
                        animal.pregnancy
                    ).toLowerCase() ===
                    "pregnant"
                );

            }
        ).length;


    if (pregnantAnimals) {

        pregnantAnimals.textContent =
            pregnantCount;

    }


    /* =========================
       SOLD ANIMALS
    ========================== */

    var soldCount =
        document.getElementById(
            "soldAnimals"
        );


    if (soldCount) {

        soldCount.textContent =
            soldAnimals.length;

    }


    /* =========================
       FARM VALUE
    ========================== */

    var farmValue =
        document.getElementById(
            "farmValue"
        );


    var totalValue =
        animals.reduce(
            function (
                total,
                animal
            ) {

                return (
                    total +
                    (
                        Number(
                            animal.estimatedValue
                        ) || 0
                    )
                );

            },
            0
        );


    if (farmValue) {

        farmValue.textContent =
            formatMoney(
                totalValue
            );

    }


    /* =========================
       ANIMAL TYPE COUNTS
    ========================== */

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


    var cattle =
        animals.filter(
            function (animal) {

                return animal.type ===
                    "Cattle";

            }
        ).length;


    var goats =
        animals.filter(
            function (animal) {

                return animal.type ===
                    "Goat";

            }
        ).length;


    var sheep =
        animals.filter(
            function (animal) {

                return animal.type ===
                    "Sheep";

            }
        ).length;


    var pigs =
        animals.filter(
            function (animal) {

                return animal.type ===
                    "Pig";

            }
        ).length;


    if (cattleCount) {

        cattleCount.textContent =
            cattle;

    }


    if (goatCount) {

        goatCount.textContent =
            goats;

    }


    if (sheepCount) {

        sheepCount.textContent =
            sheep;

    }


    if (pigCount) {

        pigCount.textContent =
            pigs;

    }


    /* =========================
       RECENT ACTIVITY
    ========================== */

    var activityList =
        document.getElementById(
            "activityList"
        );


    if (
        activityList &&
        animals.length > 0
    ) {

        var recentAnimals =
            animals.slice(-5).reverse();


        activityList.innerHTML =
            "";


        recentAnimals.forEach(
            function (animal) {

                var activity =
                    document.createElement(
                        "div"
                    );


                activity.className =
                    "activity-item";


                activity.style.padding =
                    "15px 18px";

                activity.style.borderBottom =
                    "1px solid #e8ecef";

                activity.style.fontSize =
                    "11px";


                var icon =
                    animal.type === "Cattle"
                        ? "🐄"
                        : animal.type === "Goat"
                            ? "🐐"
                            : animal.type === "Sheep"
                                ? "🐑"
                                : "🐖";


                activity.textContent =
                    icon +
                    " " +
                    animal.name +
                    " was added to your livestock.";


                activityList.appendChild(
                    activity
                );

            }
        );

    }

});
