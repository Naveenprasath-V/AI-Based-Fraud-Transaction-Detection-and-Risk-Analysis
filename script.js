const form = document.getElementById("fraudForm");
const result = document.getElementById("result");
const table = document.getElementById("transactionTable");

let transactions = [];
let chart;

const riskColors = {
    Low: "#18a979",
    Medium: "#e99b36",
    High: "#e45363"
};

function getRisk(amount, frequency, location, international, newDevice) {
    let score = 0;
    let reasons = [];

    if (amount >= 100000) {
        score += 35;
        reasons.push("Very high transaction amount.");
    } else if (amount >= 50000) {
        score += 25;
        reasons.push("High transaction amount.");
    } else if (amount >= 20000) {
        score += 15;
        reasons.push("Transaction amount is above the demo threshold.");
    }

    if (frequency >= 10) {
        score += 30;
        reasons.push("Many transactions within one hour.");
    } else if (frequency >= 5) {
        score += 20;
        reasons.push("Frequent transactions within one hour.");
    } else if (frequency >= 3) {
        score += 10;
        reasons.push("Multiple transactions within one hour.");
    }

    if (location === "unusual") {
        score += 25;
        reasons.push("Transaction from an unusual location.");
    }

    if (international) {
        score += 15;
        reasons.push("International transaction requires additional review.");
    }

    if (newDevice) {
        score += 20;
        reasons.push("Transaction made using a new device.");
    }

    score = Math.min(score, 100);

    let level;

    if (score >= 60) {
        level = "High";
    } else if (score >= 30) {
        level = "Medium";
    } else {
        level = "Low";
    }

    if (reasons.length === 0) {
        reasons.push("No risk indicators were triggered by the demo rules.");
    }

    return { score, level, reasons };
}

function generateId() {
    return "TXN" + Date.now().toString().slice(-8);
}

function formatAmount(amount) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(amount);
}

function updateDashboard() {
    const high = transactions.filter(t => t.level === "High").length;
    const medium = transactions.filter(t => t.level === "Medium").length;
    const low = transactions.filter(t => t.level === "Low").length;

    document.getElementById("totalCount").textContent = transactions.length;
    document.getElementById("highCount").textContent = high;
    document.getElementById("mediumCount").textContent = medium;
    document.getElementById("lowCount").textContent = low;

    updateChart(low, medium, high);
    updateTable();
}

function updateChart(low, medium, high) {
    const canvas = document.getElementById("riskChart");

    if (chart) {
        chart.data.datasets[0].data = [low, medium, high];
        chart.update();
        return;
    }

    chart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Low Risk", "Medium Risk", "High Risk"],
            datasets: [{
                data: [low, medium, high],
                backgroundColor: [
                    riskColors.Low,
                    riskColors.Medium,
                    riskColors.High
                ],
                borderWidth: 0,
                hoverOffset: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ": " + context.raw;
                        }
                    }
                }
            }
        }
    });
}

function showResult(transaction) {
    result.classList.remove("hidden");

    document.getElementById("riskTitle").textContent =
        transaction.level + " Risk";

    document.getElementById("riskScore").textContent =
        transaction.score;

    document.getElementById("riskDescription").textContent =
        transaction.level === "High"
            ? "Several risk indicators were triggered. Review this transaction carefully."
            : transaction.level === "Medium"
            ? "Some risk indicators were detected. Additional verification may be appropriate."
            : "Few risk indicators were detected under the current demo rules.";

    const scoreBar = document.getElementById("scoreBar");
    const scoreCircle = document.getElementById("scoreCircle");

    scoreBar.style.width = transaction.score + "%";
    scoreBar.style.backgroundColor = riskColors[transaction.level];

    scoreCircle.style.color = riskColors[transaction.level];
    scoreCircle.style.borderColor = riskColors[transaction.level];

    const list = document.getElementById("riskReasons");
    list.replaceChildren();

    transaction.reasons.forEach(reason => {
        const item = document.createElement("li");
        item.textContent = reason;
        list.appendChild(item);
    });
}

function updateTable() {
    table.replaceChildren();

    if (transactions.length === 0) {
        const row = table.insertRow();
        const cell = row.insertCell();

        cell.colSpan = 6;
        cell.className = "empty";
        cell.textContent = "No transactions analyzed yet.";
        return;
    }

    transactions.slice(0, 50).forEach(transaction => {
        const row = table.insertRow();

        const values = [
            transaction.id,
            formatAmount(transaction.amount),
            transaction.location === "unusual"
                ? "Unusual"
                : "Usual",
            transaction.score + "/100"
        ];

        values.forEach(value => {
            const cell = row.insertCell();
            cell.textContent = value;
        });

        const riskCell = row.insertCell();
        const badge = document.createElement("span");

        badge.className = "risk-badge risk-" +
            transaction.level.toLowerCase();

        badge.textContent = transaction.level;
        riskCell.appendChild(badge);

        const timeCell = row.insertCell();
        timeCell.textContent = transaction.time;
    });
}

form.addEventListener("submit", function(event) {
    event.preventDefault();

    const amount = Number(document.getElementById("amount").value);
    const frequency = Number(document.getElementById("frequency").value);
    const location = document.getElementById("location").value;
    const international = document.getElementById("international").checked;
    const newDevice = document.getElementById("newDevice").checked;

    if (!Number.isFinite(amount) || amount <= 0) {
        alert("Please enter a valid transaction amount.");
        return;
    }

    if (!Number.isInteger(frequency) || frequency < 1 || frequency > 1000) {
        alert("Enter a whole number of transactions between 1 and 1000.");
        return;
    }

    const analysis = getRisk(
        amount,
        frequency,
        location,
        international,
        newDevice
    );

    const enteredId = document.getElementById("transactionId")
        .value.trim();

    const transaction = {
        id: enteredId || generateId(),
        amount: amount,
        frequency: frequency,
        location: location,
        international: international,
        newDevice: newDevice,
        score: analysis.score,
        level: analysis.level,
        reasons: analysis.reasons,
        time: new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit"
        })
    };

    transactions.unshift(transaction);

    showResult(transaction);
    updateDashboard();

    result.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
});

form.addEventListener("reset", function() {
    setTimeout(function() {
        result.classList.add("hidden");
    }, 0);
});

document.getElementById("exportBtn").addEventListener("click", function() {
    if (transactions.length === 0) {
        alert("Analyze at least one transaction before exporting.");
        return;
    }

    const headers = [
        "Transaction ID",
        "Amount INR",
        "Frequency",
        "Location",
        "International",
        "New Device",
        "Risk Score",
        "Risk Level",
        "Time"
    ];

    const rows = transactions.map(t => [
        t.id,
        t.amount,
        t.frequency,
        t.location,
        t.international,
        t.newDevice,
        t.score,
        t.level,
        t.time
    ]);

    function escapeCSV(value) {
        const text = String(value);
        return '"' + text.replace(/"/g, '""') + '"';
    }

    const csv = [headers, ...rows]
        .map(row => row.map(escapeCSV).join(","))
        .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "fraud_transaction_report.csv";
    link.click();

    URL.revokeObjectURL(url);
});

document.querySelectorAll(".nav").forEach(link => {
    link.addEventListener("click", function() {
        document.querySelectorAll(".nav").forEach(item => {
            item.classList.remove("active");
        });

        this.classList.add("active");
    });
});

updateDashboard();
