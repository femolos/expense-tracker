let expenses = [];

let filterCategory = "all";
let sortBy = "date-desc";

let currentTotal = 0;

const form = document.querySelector("#expense-form");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const formError = document.querySelector("#form-error");

const expenseListBody = document.querySelector("#expense-list");
const emptyMessage = document.querySelector("#empty-message");

const categoryFilter = document.querySelector("#category-filter");
const sortBySelect = document.querySelector("#sort-by");

const expenseCountEl = document.querySelector("#expense-count");
const overallTotalEl = document.querySelector("#overall-total");
const categoryTotalsList = document.querySelector("#category-totals");

const convertBtn = document.querySelector("#convert-btn");
const convertResult = document.querySelector("#convert-result");

function saveExpenses() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
}

function loadExpenses() {
    const saved = localStorage.getItem("expenses");

    if (!saved) {
        return [];
    }

    try {
        return JSON.parse(saved);
    } catch (error) {
        return [];
    }
}

function getVisibleExpenses() {
    let visible = [];

    for (let i = 0; i < expenses.length; i++) {
        const expense = expenses[i];

        if (filterCategory === "all" || expense.category === filterCategory) {
            visible.push(expense);
        }
    }

    visible.sort((a, b) => {
        if (sortBy === "date-asc") {
            return new Date(a.date) - new Date(b.date);
        }
        if (sortBy === "date-desc") {
            return new Date(b.date) - new Date(a.date);
        }
        if (sortBy === "amount-asc") {
            return a.amount - b.amount;
        }
        if (sortBy === "amount-desc") {
            return b.amount - a.amount;
        }
        return 0;
    });

    return visible;
}

function render() {
    const visibleExpenses = getVisibleExpenses();

    expenseListBody.innerHTML = "";

    if (visibleExpenses.length === 0) {
        emptyMessage.hidden = false;
    } else {
        emptyMessage.hidden = true;
    }

    for (let i = 0; i < visibleExpenses.length; i++) {
        const expense = visibleExpenses[i];

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${expense.description}</td>
            <td>$${expense.amount.toFixed(2)}</td>
            <td>${expense.category}</td>
            <td>${expense.date}</td>
            <td><button class="delete-btn" data-id="${expense.id}">Delete</button></td>
        `;

        expenseListBody.appendChild(row);
    }

    let overallTotal = 0;
    const categoryTotals = {};

    for (let i = 0; i < visibleExpenses.length; i++) {
        const expense = visibleExpenses[i];
        overallTotal += expense.amount;

        if (categoryTotals[expense.category]) {
            categoryTotals[expense.category] += expense.amount;
        } else {
            categoryTotals[expense.category] = expense.amount;
        }
    }

    expenseCountEl.textContent = visibleExpenses.length;
    overallTotalEl.textContent = "$" + overallTotal.toFixed(2);
    currentTotal = overallTotal;

    categoryTotalsList.innerHTML = "";

    for (const category in categoryTotals) {
        const item = document.createElement("li");
        item.textContent = category + ": $" + categoryTotals[category].toFixed(2);
        categoryTotalsList.appendChild(item);
    }
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;

    if (description === "") {
        formError.textContent = "Description is required.";
        formError.hidden = false;
        return;
    }

    if (!(amount > 0)) {
        formError.textContent = "Amount must be greater than 0.";
        formError.hidden = false;
        return;
    }

    if (date === "") {
        formError.textContent = "Date is required.";
        formError.hidden = false;
        return;
    }

    formError.hidden = true;

    expenses.push({
        id: Date.now(),
        description: description,
        amount: amount,
        category: category,
        date: date,
    });

    saveExpenses();
    render();
    form.reset();
    setDateToToday();
});

expenseListBody.addEventListener("click", (event) => {
    if (!event.target.classList.contains("delete-btn")) {
        return;
    }

    const idToRemove = Number(event.target.dataset.id);

    expenses = expenses.filter((expense) => expense.id !== idToRemove);

    saveExpenses();
    render();
});

categoryFilter.addEventListener("change", () => {
    filterCategory = categoryFilter.value;
    render();
});

sortBySelect.addEventListener("change", () => {
    sortBy = sortBySelect.value;
    render();
});

convertBtn.addEventListener("click", async () => {
    convertBtn.disabled = true;
    convertBtn.textContent = "Converting...";
    convertResult.textContent = "";

    try {
        const response = await fetch("https://open.er-api.com/v6/latest/USD");

        if (!response.ok) {
            throw new Error("Request failed");
        }

        const data = await response.json();
        const rate = data.rates.EUR;

        const converted = currentTotal * rate;
        convertResult.textContent = "≈ €" + converted.toFixed(2) + " EUR";
    } catch (error) {
        convertResult.textContent = "Could not convert currency. Please try again.";
    } finally {
        convertBtn.disabled = false;
        convertBtn.textContent = "Convert to EUR";
    }
});

function setDateToToday() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    dateInput.value = `${year}-${month}-${day}`;
}

expenses = loadExpenses();
setDateToToday();
render();