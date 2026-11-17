document.addEventListener("livestock:ready", function () {
    "use strict";

    var menu = document.getElementById("menuButton");
    var nav = document.getElementById("navLinks");
    if (menu && nav) {
        menu.addEventListener("click", function () {
            nav.classList.toggle("open");
        });
    }

    function safePhoto(v){v=String(v||"");return /^(data:image\/(png|jpeg|gif|webp);base64,|https:\/\/|blob:)/i.test(v)?LivestockCore.escapeHTML(v):"";}

    function animals() {
        return LivestockCore.getAnimals();
    }

    function icon(value) {
        var v = String(value || "").toLowerCase();
        if (v.indexOf("cattle") >= 0 || v === "cow" || v === "bull") return "🐄";
        if (v.indexOf("goat") >= 0) return "🐐";
        if (v.indexOf("sheep") >= 0) return "🐑";
        if (v.indexOf("pig") >= 0) return "🐖";
        return "🐾";
    }

    function type(value) {
        var v = String(value || "").toLowerCase();
        if (v.indexOf("cattle") >= 0 || v === "cow" || v === "bull") return "Cattle";
        if (v.indexOf("goat") >= 0) return "Goat";
        if (v.indexOf("sheep") >= 0) return "Sheep";
        if (v.indexOf("pig") >= 0) return "Pig";
        return "Animal";
    }

    function pregnant(a) {
        return !!a && (a.pregnant === true || String(a.pregnancy || "").toLowerCase() === "pregnant");
    }

    function formatDate(value) {
        if (!value) return "Not recorded";
        var d = new Date(value + "T00:00:00");
        return isNaN(d.getTime()) ? "Not recorded" : d.toLocaleDateString("en-ZA", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }

    function daysText(value) {
        var d = LivestockCore.daysUntil(value);
        if (d === null) return "";
        if (d < 0) return "Overdue by " + Math.abs(d) + " day(s).";
        if (d === 0) return "Due today.";
        return d + " day(s) remaining.";
    }

    function setText(id, value) {
        var element = document.getElementById(id);
        if (element) {
            element.textContent = value === null || value === undefined || value === ""
                ? "Not recorded"
                : value;
        }
    }

    var list = document.getElementById("animalDirectoryList");
    var empty = document.getElementById("animalDirectoryEmpty");
    var search = document.getElementById("animalSearch");
    var filter = document.getElementById("animalFilter");
    var currentAnimal = null;

    function renderDirectory() {
        if (!list) return;

        var query = (search && search.value || "").toLowerCase();
        var selectedFilter = filter ? filter.value : "all";

        var records = animals().filter(function (a) {
            var searchable = [
                a.name,
                a.tag,
                a.animalTag,
                a.breed,
                a.registrationNumber
            ].join(" ").toLowerCase();

            var matchesSearch = searchable.indexOf(query) >= 0;
            var matchesFilter = selectedFilter === "all" ||
                type(a.type) === selectedFilter ||
                (selectedFilter === "Pregnant" && pregnant(a));

            return matchesSearch && matchesFilter;
        });

        list.innerHTML = "";
        if (empty) empty.style.display = records.length ? "none" : "block";

        records.forEach(function (a) {
            var button = document.createElement("button");
            button.type = "button";
            button.className = "animal-directory-item";
            button.innerHTML =
                '<span class="directory-avatar">' +
                    (safePhoto(a.photo) ? '<img src="' + safePhoto(a.photo) + '" alt="">' : icon(a.type)) +
                '</span>' +
                '<span class="directory-main">' +
                    '<strong>' + LivestockCore.escapeHTML(a.name || "Unnamed animal") + '</strong>' +
                    '<small>' + type(a.type) + ' • ' + LivestockCore.escapeHTML(a.breed || "Breed not recorded") + '</small>' +
                '</span>' +
                '<span class="directory-status">' + (pregnant(a) ? "Pregnant" : "Active") + '</span>';

            button.addEventListener("click", function () {
                localStorage.setItem("selectedAnimalId", a.id);
                showAnimal(a);
            });

            list.appendChild(button);
        });
    }

    if (search) search.addEventListener("input", renderDirectory);
    if (filter) filter.addEventListener("change", renderDirectory);

    function showAnimal(a) {
        if (!a) return;
        currentAnimal = a;

        var avatar = document.getElementById("animalAvatar");
        if (avatar) {
            avatar.innerHTML = safePhoto(a.photo)
                ? '<img src="' + safePhoto(a.photo) + '" alt="">'
                : icon(a.type);
        }

        setText("animalName", a.name || "Unnamed Animal");
        setText("animalType", type(a.type));
        setText("animalBreed", a.breed || "Breed not recorded");
        setText("animalStatus", pregnant(a) ? "Pregnant" : "Active");
        setText("animalTag", a.animalTag || a.tag);
        setText("animalTypeInfo", type(a.type));
        setText("animalBreedInfo", a.breed);
        setText("animalSex", a.sex);
        setText("animalBirthDate", a.birthDate);
        setText("animalWeight", a.weight ? a.weight + " kg" : "Not recorded");
        setText("pregnancyStatus", pregnant(a) ? "Pregnant" : "Not Pregnant");

        var birthInfo = document.getElementById("birthInfo");
        if (birthInfo) {
            birthInfo.style.display = pregnant(a) && a.expectedBirthDate ? "block" : "none";
        }
        setText("expectedBirth", a.expectedBirthDate ? formatDate(a.expectedBirthDate) : "-");

        var calculatorType = document.getElementById("calculatorType");
        var calculatorDate = document.getElementById("calculatorDate");
        var calculatorResult = document.getElementById("calculatorResult");

        if (calculatorType) {
            calculatorType.value = type(a.type) === "Animal" ? "" : type(a.type);
        }
        if (calculatorDate) {
            calculatorDate.value = a.pregnancyStartDate || "";
        }
        if (calculatorResult && a.expectedBirthDate) {
            calculatorResult.textContent =
                "Expected birth: " + formatDate(a.expectedBirthDate) +
                " • " + daysText(a.expectedBirthDate);
        }

        setText("recordTag", a.animalTag || a.tag);
        setText("recordLot", a.lotNumber);
        setText(
            "recordRegistration",
            a.registrationNumber
                ? a.registrationNumber + " • " + (a.registrationStatus || "")
                : a.registrationStatus
        );
        setText("recordHerdbook", a.herdbook);
        setText("recordHorn", a.hornStatus);
        setText("recordBirthDate", a.birthDate);
        setText("recordInspection", a.inspectionDate);
        setText("recordCalvings", a.calvings != null ? a.calvings : (a.offspring || 0));
        setText("recordLastCalving", a.lastCalvingDate);
        setText("recordSire", a.sire);
        setText("recordDam", a.dam);
        setText("recordRemarks", a.sellerRemarks || "No remarks recorded.");
    }

    var selectedId = localStorage.getItem("selectedAnimalId");
    var selectedAnimal = animals().find(function (a) {
        return String(a.id) === String(selectedId);
    });

    if (selectedAnimal) {
        showAnimal(selectedAnimal);
    } else {
        setText("animalName", "Select an animal");
        setText("animalBreed", "Choose an animal from the list above.");
    }

    var calculateButton = document.getElementById("calculatePregnancy");
    if (calculateButton) {
        calculateButton.addEventListener("click", function () {
            var result = document.getElementById("calculatorResult");
            var calculatorType = document.getElementById("calculatorType");
            var calculatorDate = document.getElementById("calculatorDate");

            if (!result || !calculatorType || !calculatorDate) return;

            if (!calculatorType.value || !calculatorDate.value) {
                result.textContent =
                    "Please select the animal type and enter the pregnancy start / conception date.";
                return;
            }

            var birthDate = LivestockCore.calculateBirthDate(
                calculatorType.value,
                calculatorDate.value
            );

            if (!birthDate) {
                result.textContent =
                    "The pregnancy could not be calculated. Please check the type and date.";
                return;
            }

            result.textContent =
                "Expected birth: " + formatDate(birthDate) +
                " • " + LivestockCore.getGestationDays(calculatorType.value) +
                " days gestation • " + daysText(birthDate);
        });
    }

    var deleteButton = document.getElementById("deleteAnimal");
    if (deleteButton) {
        deleteButton.addEventListener("click", function () {
            if (!currentAnimal) return;

            if (!confirm(
                "Are you sure you want to permanently delete " +
                (currentAnimal.name || "this animal") + "?"
            )) return;

            LivestockCore.saveAnimals(
                animals().filter(function (a) {
                    return String(a.id) !== String(currentAnimal.id);
                })
            );

            localStorage.removeItem("selectedAnimalId");
            window.location.href = "animals.html";
        });
    }

    renderDirectory();
});
