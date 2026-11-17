document.addEventListener("livestock:ready", function () {

    /* =========================
       NAVIGATION
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
       STORAGE KEYS
    ========================== */

    var SOLD_KEY =
        "soldLivestock";

    var EXPENSE_KEY =
        "farmExpenses";

    /*
     * These are the same storage names
     * used by the redesigned Animals page.
     */

    var ANIMAL_KEY =
        "livestockAnimals";

    var FEED_KEY =
        "farmFeedPurchases";

    var HEALTH_KEY =
        "livestockHealthRecords";


    /* =========================
       ELEMENTS
    ========================== */

    var totalIncome =
        document.getElementById("totalIncome");

    var totalExpenses =
        document.getElementById("totalExpenses");

    var netProfit =
        document.getElementById("netProfit");

    var activeInvestment =
        document.getElementById("activeInvestment");

    var animalSales =
        document.getElementById("animalSales");

    var feedExpenses =
        document.getElementById("feedExpenses");

    var healthExpenses =
        document.getElementById("healthExpenses");

    var otherExpenses =
        document.getElementById("otherExpenses");

    var expenseForm =
        document.getElementById("expenseForm");

    var expenseList =
        document.getElementById("expenseList");

    var expenseEmpty =
        document.getElementById("expenseEmpty");

    var soldAnimalsList =
        document.getElementById(
            "soldAnimalsList"
        );

    var soldAnimalsEmpty =
        document.getElementById(
            "soldAnimalsEmpty"
        );


    /* =========================
       STORAGE FUNCTIONS
    ========================== */

    function getStorageArray(key) {

        try {

            var data =
                JSON.parse(
                    localStorage.getItem(key)
                );


            if (Array.isArray(data)) {

                return data;

            }

        } catch (error) {

            console.log(
                "Could not load:",
                key
            );

        }


        return [];

    }


    function saveStorageArray(
        key,
        data
    ) {

        localStorage.setItem(
            key,
            JSON.stringify(data)
        );

    }


    /* =========================
       MONEY
    ========================== */

    function money(amount) {

        var value =
            Number(amount) || 0;


        return (
            "R" +
            value.toLocaleString(
                "en-ZA",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            )
        );

    }


    /* =========================
       DATE
    ========================== */

    function formatDate(date) {

        if (!date) {

            return "No date";

        }


        var parsed =
            new Date(date);


        if (
            isNaN(
                parsed.getTime()
            )
        ) {

            return "No date";

        }


        return parsed.toLocaleDateString(
            "en-ZA",
            {
                day: "2-digit",
                month: "short",
                year: "numeric"
            }
        );

    }


    function getToday() {

        var date =
            new Date();


        var year =
            date.getFullYear();


        var month =
            String(
                date.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        var day =
            String(
                date.getDate()
            ).padStart(
                2,
                "0"
            );


        return (
            year +
            "-" +
            month +
            "-" +
            day
        );

    }


    /* =========================
       SOLD LIVESTOCK
    ========================== */

    function getSoldAnimals() {

        return getStorageArray(
            SOLD_KEY
        );

    }


    function calculateAnimalSales() {

        var soldAnimals =
            getSoldAnimals();


        return soldAnimals.reduce(
            function (
                total,
                animal
            ) {

                return (
                    total +
                    (
                        Number(
                            animal.sellingPrice
                        ) || 0
                    )
                );

            },
            0
        );

    }


    function calculateTradingProfit() {

        var soldAnimals = getSoldAnimals();

        return soldAnimals.reduce(function (total, animal) {
            var explicit = Number(animal.profitLoss);
            if (Number.isFinite(explicit)) return total + explicit;

            var sale = Number(animal.sellingPrice) || 0;
            var investment = Number(animal.totalInvestment);
            if (!Number.isFinite(investment)) {
                investment = (Number(animal.purchasePrice) || 0) + (Number(animal.expenses) || 0);
            }
            return total + sale - investment;
        }, 0);

    }


    /* =========================
       ACTIVE INVESTMENT
    ========================== */

    function calculateActiveInvestment() {

        var animals =
            getStorageArray(
                ANIMAL_KEY
            );


        return animals.reduce(
            function (
                total,
                animal
            ) {

                var purchase =
                    Number(
                        animal.purchasePrice
                    ) || 0;


                var expenses =
                    Number(
                        animal.expenses
                    ) || 0;


                return (
                    total +
                    purchase +
                    expenses
                );

            },
            0
        );

    }


    /* =========================
       FEED EXPENSES
    ========================== */

    function calculateFeedExpenses() {

        var records =
            getStorageArray(
                FEED_KEY
            );


        return records.reduce(
            function (
                total,
                record
            ) {

                /*
                 * Supports the common
                 * amount field names.
                 */

                var amount =
                    Number(
                        record.amount
                    ) ||
                    Number(
                        record.cost
                    ) ||
                    Number(
                        record.price
                    ) ||
                    0;


                return total + amount;

            },
            0
        );

    }


    /* =========================
       HEALTH EXPENSES
    ========================== */

    function calculateHealthExpenses() {

        var records =
            getStorageArray(
                HEALTH_KEY
            );


        return records.reduce(
            function (
                total,
                record
            ) {

                var amount =
                    Number(
                        record.amount
                    ) ||
                    Number(
                        record.cost
                    ) ||
                    Number(
                        record.price
                    ) ||
                    0;


                return total + amount;

            },
            0
        );

    }


    /* =========================
       OTHER EXPENSES
    ========================== */

    function calculateOtherExpenses() {

        var records =
            getStorageArray(
                EXPENSE_KEY
            );


        return records.reduce(
            function (
                total,
                record
            ) {

                return (
                    total +
                    (
                        Number(
                            record.amount
                        ) || 0
                    )
                );

            },
            0
        );

    }


    /* =========================
       TOTAL EXPENSES
    ========================== */

    function calculateTotalExpenses() {

        var feed =
            calculateFeedExpenses();


        var health =
            calculateHealthExpenses();


        var other =
            calculateOtherExpenses();


        return (
            feed +
            health +
            other
        );

    }


    /* =========================
       RENDER FINANCIAL STATS
    ========================== */

    function renderStats() {

        var income =
            calculateAnimalSales();


        var feed =
            calculateFeedExpenses();


        var health =
            calculateHealthExpenses();


        var other =
            calculateOtherExpenses();


        var expenses =
            feed +
            health +
            other;

        var tradingProfit =
            calculateTradingProfit();

        var profit =
            tradingProfit -
            expenses;


        totalIncome.textContent =
            money(income);


        totalExpenses.textContent =
            money(expenses);


        netProfit.textContent =
            money(
                profit
            );


        if (profit < 0) {

            netProfit.classList.add(
                "loss"
            );

        } else {

            netProfit.classList.remove(
                "loss"
            );

        }


        activeInvestment.textContent =
            money(
                calculateActiveInvestment()
            );


        animalSales.textContent =
            money(income);

        var tradingProfitElement = document.getElementById("tradingProfit");
        if (tradingProfitElement) {
            tradingProfitElement.textContent = money(tradingProfit);
            tradingProfitElement.classList.toggle("loss", tradingProfit < 0);
        }


        feedExpenses.textContent =
            money(feed);


        healthExpenses.textContent =
            money(health);


        otherExpenses.textContent =
            money(other);

    }


    /* =========================
       ADD OTHER EXPENSE
    ========================== */

    if (expenseForm) {

        expenseForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();


                var description =
                    document.getElementById(
                        "expenseDescription"
                    ).value.trim();


                var category =
                    document.getElementById(
                        "expenseCategory"
                    ).value;


                var amount =
                    Number(
                        document.getElementById(
                            "expenseAmount"
                        ).value
                    );


                var date =
                    document.getElementById(
                        "expenseDate"
                    ).value;


                if (
                    !description ||
                    !category ||
                    !Number.isFinite(amount) ||
                    amount < 0 ||
                    !date
                ) {

                    alert(
                        "Please complete all expense fields."
                    );

                    return;

                }


                var expenses =
                    getStorageArray(
                        EXPENSE_KEY
                    );


                expenses.push({

                    id:
                        Date.now().toString(),

                    description:
                        description,

                    category:
                        category,

                    amount:
                        amount,

                    date:
                        date

                });


                saveStorageArray(
                    EXPENSE_KEY,
                    expenses
                );


                expenseForm.reset();


                renderAll();

            }
        );

    }


    /* =========================
       RENDER OTHER EXPENSES
    ========================== */

    function renderExpenses() {

        var expenses =
            getStorageArray(
                EXPENSE_KEY
            );


        expenseList.innerHTML =
            "";


        if (
            expenses.length === 0
        ) {

            expenseEmpty.style.display =
                "block";

            return;

        }


        expenseEmpty.style.display =
            "none";


        expenses
            .slice()
            .reverse()
            .forEach(
                function (expense) {

                    var item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "expense-item";


                    item.innerHTML =

                        '<div class="expense-info">' +

                            '<h3>' +
                                escapeHTML(
                                    expense.description
                                ) +
                            '</h3>' +

                            '<p>' +
                                escapeHTML(
                                    expense.category
                                ) +
                                " • " +
                                formatDate(
                                    expense.date
                                ) +
                            '</p>' +

                        '</div>' +

                        '<strong class="expense-amount">' +
                            money(
                                expense.amount
                            ) +
                        '</strong>' +

                        '<button ' +
                            'type="button" ' +
                            'class="delete-expense" ' +
                            'data-delete-expense="' +
                                expense.id +
                            '">' +
                            'Delete' +
                        '</button>';


                    expenseList.appendChild(
                        item
                    );

                }
            );


        attachDeleteButtons();

    }


    /* =========================
       DELETE EXPENSE
    ========================== */

    function attachDeleteButtons() {

        var buttons =
            document.querySelectorAll(
                "[data-delete-expense]"
            );


        buttons.forEach(
            function (button) {

                button.addEventListener(
                    "click",
                    function () {

                        var id =
                            button.getAttribute(
                                "data-delete-expense"
                            );


                        var confirmed =
                            confirm(
                                "Delete this expense?"
                            );


                        if (!confirmed) {

                            return;

                        }


                        var expenses =
                            getStorageArray(
                                EXPENSE_KEY
                            );


                        var updated =
                            expenses.filter(
                                function (expense) {

                                    return (
                                        expense.id !==
                                        id
                                    );

                                }
                            );


                        saveStorageArray(
                            EXPENSE_KEY,
                            updated
                        );


                        renderAll();

                    }
                );

            }
        );

    }


    /* =========================
       RENDER SOLD ANIMALS
    ========================== */

    function renderSoldAnimals() {

        var animals =
            getSoldAnimals();


        soldAnimalsList.innerHTML =
            "";


        if (
            animals.length === 0
        ) {

            soldAnimalsEmpty.style.display =
                "block";

            return;

        }


        soldAnimalsEmpty.style.display =
            "none";


        animals
            .slice()
            .reverse()
            .forEach(
                function (animal) {

                    var item =
                        document.createElement(
                            "div"
                        );


                    item.className =
                        "sold-item";


                    var result =
                        Number(
                            animal.profitLoss
                        ) || 0;


                    var resultClass =
                        result >= 0
                            ? "profit"
                            : "loss";


                    var resultLabel =
                        result >= 0
                            ? "Profit"
                            : "Loss";


                    item.innerHTML =

                        '<div class="sold-animal">' +

                            '<h3>' +
                                getAnimalIcon(
                                    animal.type
                                ) +
                                " " +
                                escapeHTML(
                                    animal.name
                                ) +
                            '</h3>' +

                            '<p>' +
                                escapeHTML(
                                    animal.breed || ""
                                ) +
                            '</p>' +

                        '</div>' +


                        createMoneyColumn(
                            "PURCHASE",
                            money(
                                animal.purchasePrice
                            )
                        ) +


                        createMoneyColumn(
                            "EXPENSES",
                            money(
                                animal.expenses
                            )
                        ) +


                        createMoneyColumn(
                            "SOLD FOR",
                            money(
                                animal.sellingPrice
                            )
                        ) +


                        createMoneyColumn(
                            resultLabel.toUpperCase(),
                            '<span class="' +
                            resultClass +
                            '">' +
                            money(
                                Math.abs(result)
                            ) +
                            '</span>'
                        );


                    soldAnimalsList.appendChild(
                        item
                    );

                }
            );

    }


    function createMoneyColumn(
        label,
        value
    ) {

        return (

            '<div class="money-column">' +

                '<span>' +
                    label +
                '</span>' +

                '<strong>' +
                    value +
                '</strong>' +

            '</div>'

        );

    }


    /* =========================
       ANIMAL ICON
    ========================== */

    function getAnimalIcon(type) {

        if (type === "Cattle") {

            return "🐄";

        }

        if (type === "Goat") {

            return "🐐";

        }

        if (type === "Sheep") {

            return "🐑";

        }

        if (type === "Pig") {

            return "🐖";

        }


        return "🐄";

    }


    /* =========================
       ESCAPE HTML
    ========================== */

    function escapeHTML(value) {

        return String(value)
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
       RENDER EVERYTHING
    ========================== */

    function renderAll() {

        renderStats();

        renderExpenses();

        renderSoldAnimals();

    }


    /* =========================
       DEFAULT DATE
    ========================== */

    var expenseDate =
        document.getElementById(
            "expenseDate"
        );


    if (expenseDate) {

        expenseDate.value =
            getToday();

    }


    /* =========================
       START
    ========================== */

    renderAll();

});
