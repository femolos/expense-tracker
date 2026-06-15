// ---------- State ----------

// All expenses are stored in this array.
// Each expense is an object like:
// { id: 123, description: "Coffee", amount: 4.5, category: "Food", date: "2026-06-15" }
let expenses = [];

// Current filter and sort settings, controlled by the dropdowns
let filterCategory = "All";
let sortBy = "date-desc";

// Keeps track of the current overall total so the
// "Convert to EUR" button can use it without recalculating
let currentTotal = 0;

// ---------- DOM References ----------

// Elements for the "Add an Expense" form
const form = document.querySelector("#expense-form");
const descriptionInput = document.querySelector("#description");
const amountInput = document.querySelector("#amount");
const categoryInput = document.querySelector("#category");
const dateInput = document.querySelector("#date");
const formError = document.querySelector("#form-error");

// Elements for the expense table and its empty state
const expenseListBody = document.querySelector("#expense-list");
const emptyMessage = document.querySelector("#empty-message");

// Filter and sort dropdowns above the table
const categoryFilter = document.querySelector("#category-filter");
const sortBySelect = document.querySelector("#sort-by");

// Elements that display the totals
const expenseCountEl = document.querySelector("#expense-count");
const overallTotalEl = document.querySelector("#overall-total");
const categoryTotalsList = document.querySelector("#category-totals");

// Currency conversion button and its result message
const convertBtn = document.querySelector("#convert-btn");
const convertResult = document.querySelector("#convert-result");

// ---------- Persistence (localStorage) ----------

// Save the current expense list so it survives a page refresh
function saveExpenses() {
    localStorage.setItem("expenses", JSON.stringify(expenses));
}

// Load expenses from localStorage. If nothing is saved, or the
// saved data can't be read, fall back to an empty list.
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

// ---------- Filtering and Sorting ----------

// Returns the list of expenses that should currently be shown,
// based on the selected category filter and sort option.
function getVisibleExpenses() {
    // Keep only expenses matching the selected category (or all of them)
    const filtered = expenses.filter((expense) => {
        return filterCategory === "All" || expense.category === filterCategory;
    });

    // Sort a copy of the filtered list so we don't change the
    // order of the original `expenses` array.
    // A sort function returns a negative number if `a` should come
    // first, positive if `b` should come first, and 0 if it doesn't matter.
    const sorted = [...filtered].sort((a, b) => {
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

    return sorted;
}

// ---------- Rendering ----------

// Rebuilds the table, totals, and category breakdown from the
// current state. Called after every change.
function render() {
    const visibleExpenses = getVisibleExpenses();

    renderTable(visibleExpenses);
    renderTotals(visibleExpenses);
}

// Renders the table rows (or the empty-state message)
function renderTable(visibleExpenses) {
    if (visibleExpenses.length === 0) {
        expenseListBody.innerHTML = "";
        emptyMessage.hidden = false;
        return;
    }

    emptyMessage.hidden = true;

    // Build one row of HTML per expense, then join them all together
    const rowsHtml = visibleExpenses
        .map((expense) => {
            return `
                <tr>
                    <td>${expense.description}</td>
                    <td>$${expense.amount.toFixed(2)}</td>
                    <td>${expense.category}</td>
                    <td>${expense.date}</td>
                    <td><button class="delete-btn" data-id="${expense.id}">Delete</button></td>
                </tr>
            `;
        })
        .join("");

    expenseListBody.innerHTML = rowsHtml;
}

// Updates the expense count, overall total, and per-category totals
function renderTotals(visibleExpenses) {
    // Overall total: add up every expense's amount
    const overallTotal = visibleExpenses.reduce((sum, expense) => {
        return sum + expense.amount;
    }, 0);

    // Per-category totals: build an object like { Food: 12.5, Housing: 800 }
    const categoryTotals = visibleExpenses.reduce((totals, expense) => {
        const current = totals[expense.category] || 0;
        totals[expense.category] = current + expense.amount;
        return totals;
    }, {});

    expenseCountEl.textContent = visibleExpenses.length;
    overallTotalEl.textContent = "$" + overallTotal.toFixed(2);
    currentTotal = overallTotal;

    // Show one list item per category
    categoryTotalsList.innerHTML = Object.entries(categoryTotals)
        .map(([category, total]) => {
            return `<li>${category}: $${total.toFixed(2)}</li>`;
        })
        .join("");
}

// ---------- Adding an Expense ----------

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const description = descriptionInput.value.trim();
    const amount = Number(amountInput.value);
    const category = categoryInput.value;
    const date = dateInput.value;

    // Validate the inputs before adding anything
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

    // Inputs are valid, hide any previous error message
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

// ---------- Deleting an Expense (Event Delegation) ----------

// Instead of adding a click listener to every delete button (which
// would need to be redone every time we re-render), we listen once
// on the table body and check what was actually clicked.
expenseListBody.addEventListener("click", (event) => {
    if (!event.target.classList.contains("delete-btn")) {
        return;
    }

    // Each delete button has a data-id attribute matching the
    // expense's id (set in renderTable above)
    const idToRemove = Number(event.target.dataset.id);

    expenses = expenses.filter((expense) => expense.id !== idToRemove);

    saveExpenses();
    render();
});

// ---------- Filter and Sort Controls ----------

categoryFilter.addEventListener("change", () => {
    filterCategory = categoryFilter.value;
    render();
});

sortBySelect.addEventListener("change", () => {
    sortBy = sortBySelect.value;
    render();
});

// ---------- Currency Conversion (fetch + async/await) ----------

convertBtn.addEventListener("click", async () => {
    // Show a loading state while we wait for the API response
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

// ---------- Date Helper ----------

// Sets the date input to today's date, in the YYYY-MM-DD format
// that <input type="date"> requires
function setDateToToday() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    dateInput.value = `${year}-${month}-${day}`;
}

// ---------- Init ----------

expenses = loadExpenses();
setDateToToday();
render();