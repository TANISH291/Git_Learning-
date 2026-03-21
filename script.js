document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Elements ---
    const themeToggleBtn = document.getElementById('theme-toggle');
    const transactionForm = document.getElementById('transaction-form');
    const titleInput = document.getElementById('title');
    const amountInput = document.getElementById('amount');
    const typeSelect = document.getElementById('type');
    const categorySelect = document.getElementById('category');
    const dateInput = document.getElementById('date');
    const transactionList = document.getElementById('transaction-list');
    
    // Summary Elements
    const totalBalanceEl = document.getElementById('total-balance');
    const totalIncomeEl = document.getElementById('total-income');
    const totalExpenseEl = document.getElementById('total-expense');

    // Filter Elements
    const filterType = document.getElementById('filter-type');
    const filterMonth = document.getElementById('filter-month');
    
    // Chart Element
    const ctx = document.getElementById('expenseChart').getContext('2d');
    let expenseChartInstance = null;

    // --- 2. State Management ---
    // Load from local storage or set empty array
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    
    // Set default date to today
    dateInput.valueAsDate = new Date();

    // --- 3. UI Update Functions ---
    
    // Update local storage
    const updateLocalStorage = () => {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    };

    // Format money helper
    const formatMoney = (amount) => {
        return '$' + Math.abs(amount).toFixed(2);
    };

    // Update Income, Expense and Total Balance
    const updateTotals = () => {
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((acc, t) => acc + t.amount, 0);

        const expense = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);

        const balance = income - expense;

        totalBalanceEl.innerText = (balance < 0 ? '-' : '') + formatMoney(balance);
        totalIncomeEl.innerText = '+' + formatMoney(income);
        totalExpenseEl.innerText = '-' + formatMoney(expense);
        
        // Update styling if negative balance
        totalBalanceEl.style.color = balance < 0 ? 'var(--danger-color)' : '';
    };

    // Render individual transaction DOM element
    const renderTransaction = (transaction) => {
        const li = document.createElement('li');
        li.classList.add('transaction-item', transaction.type);
        
        const sign = transaction.type === 'income' ? '+' : '-';
        
        li.innerHTML = `
            <div class="item-info">
                <span class="item-title">${transaction.title}</span>
                <span class="item-date-cat">${transaction.date} | ${transaction.category}</span>
            </div>
            <div class="item-amount-action">
                <span class="item-amount">${sign}${formatMoney(transaction.amount)}</span>
                <button class="btn-delete" onclick="deleteTransaction(${transaction.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        transactionList.appendChild(li);
    };

    // Render list based on filters
    const renderList = () => {
        transactionList.innerHTML = '';
        
        const typeFilterVal = filterType.value;
        const monthFilterVal = filterMonth.value; // Format "YYYY-MM"

        // Filter logic
        const filtered = transactions.filter(t => {
            const matchesType = typeFilterVal === 'all' || t.type === typeFilterVal;
            const matchesMonth = monthFilterVal === '' || t.date.substring(0, 7) === monthFilterVal;
            return matchesType && matchesMonth;
        });

        // Sort by date descending
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (filtered.length === 0) {
            transactionList.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No transactions found.</p>';
        } else {
            filtered.forEach(renderTransaction);
        }
    };

    // Render and update Pie Chart
    const updateChart = () => {
        // Group expenses by category
        const expenses = transactions.filter(t => t.type === 'expense');
        
        const categoryData = expenses.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        const chartColors = [
            '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'
        ];

        // Destroy previous instance to prevent overlapping hover logic
        if (expenseChartInstance) {
            expenseChartInstance.destroy();
        }

        if (data.length === 0) {
            // Provide empty state chart logic or visual
            expenseChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['No Expenses'],
                    datasets: [{
                        data: [1],
                        backgroundColor: ['#e5e7eb']
                    }]
                },
                options: { responsive: true, maintainAspectRatio: false }
            });
            return;
        }

        expenseChartInstance = new Chart(ctx, {
            type: 'pie', // Pie chart requested
            data: {
                labels: labels.map(l => l.charAt(0).toUpperCase() + l.slice(1)), 
                datasets: [{
                    data: data,
                    backgroundColor: chartColors.slice(0, labels.length),
                    borderWidth: 1,
                    borderColor: getComputedStyle(document.body).getPropertyValue('--card-bg')
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: getComputedStyle(document.body).getPropertyValue('--text-primary')
                        }
                    }
                }
            }
        });
    };

    // Master initialize function
    const init = () => {
        updateTotals();
        renderList();
        updateChart();
    };

    // --- 4. Event Listeners ---
    
    // Add Transaction
    transactionForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Validation (html attributes also handle basic validation)
        if (titleInput.value.trim() === '' || amountInput.value.trim() === '') {
            alert('Please add a text and amount');
            return;
        }

        const newTransaction = {
            id: Math.floor(Math.random() * 100000000), // Unique ID
            title: titleInput.value.trim(),
            amount: parseFloat(amountInput.value),
            type: typeSelect.value,
            category: categorySelect.value,
            date: dateInput.value
        };

        transactions.push(newTransaction);
        updateLocalStorage();
        
        // Reset form to default fields
        titleInput.value = '';
        amountInput.value = '';
        
        // Re-render
        init();
    });

    // Delete transaction globally
    window.deleteTransaction = (id) => {
        transactions = transactions.filter(t => t.id !== id);
        updateLocalStorage();
        init();
    };

    // Filter changes
    filterType.addEventListener('change', renderList);
    filterMonth.addEventListener('change', renderList);

    // Dynamic category options based on type (Income/Expense)
    typeSelect.addEventListener('change', (e) => {
        const isIncome = e.target.value === 'income';
        const options = categorySelect.options;
        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            if (isIncome) {
                // Show only income options
                opt.style.display = ['salary', 'freelance', 'other'].includes(opt.value) ? 'block' : 'none';
                if (['salary', 'freelance', 'other'].includes(opt.value)) categorySelect.value = 'salary';
            } else {
                // Show expense options
                opt.style.display = ['housing', 'food', 'transportation', 'utilities', 'entertainment', 'other'].includes(opt.value) ? 'block' : 'none';
                if (['housing', 'food', 'transportation', 'utilities', 'entertainment', 'other'].includes(opt.value)) categorySelect.value = 'food';
            }
        }
    });

    // Run trigger once for default filter setup
    typeSelect.dispatchEvent(new Event('change'));

    // Dark Mode Toggle
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('light-mode');
        
        const isDark = document.body.classList.contains('dark-mode');
        themeToggleBtn.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
        
        // Save preference to localStorage
        localStorage.setItem('darkMode', isDark);

        // Re-render chart to update colors based on theme
        updateChart();
    });

    // Check saved theme initially
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        document.body.classList.remove('light-mode');
        themeToggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    // --- 5. Initial Call ---
    init();
});
