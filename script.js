(function () {
  "use strict";

  var STORAGE_KEY = "calculadoraWebHistorial";
  var MAX_INPUT_LENGTH = 15;
  var currentInput = "0";
  var storedValue = null;
  var selectedOperator = null;
  var waitingForOperand = false;
  var justCalculated = false;

  var resultElement = document.getElementById("result");
  var expressionElement = document.getElementById("expression");
  var keypad = document.getElementById("keypad");
  var historyList = document.getElementById("history-list");
  var emptyHistory = document.getElementById("empty-history");
  var clearHistoryButton = document.getElementById("clear-history");

  function getHistory() {
    try {
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      return [];
    }
  }

  function saveHistory(history) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      /* La calculadora continúa funcionando aunque el navegador bloquee el almacenamiento. */
    }
  }

  function formatNumber(value) {
    if (!isFinite(value)) {
      return "Error";
    }

    var rounded = Math.round(value * 10000000000) / 10000000000;
    var text = String(rounded);

    if (Math.abs(rounded) >= 1000000000000 || (Math.abs(rounded) > 0 && Math.abs(rounded) < 0.000000001)) {
      text = rounded.toExponential(7);
    }

    return text;
  }

  function operatorSymbol(operator) {
    var symbols = { "+": "+", "-": "−", "*": "×", "/": "÷" };
    return symbols[operator] || operator;
  }

  function updateDisplay(message) {
    resultElement.textContent = message || currentInput;
    resultElement.classList.toggle("is-error", Boolean(message));

    if (storedValue !== null && selectedOperator) {
      expressionElement.textContent = formatNumber(storedValue) + " " + operatorSymbol(selectedOperator) + (waitingForOperand ? "" : " " + currentInput);
    } else if (!justCalculated) {
      expressionElement.textContent = "Listo para calcular";
    }
  }

  function inputDigit(digit) {
    if (justCalculated || waitingForOperand) {
      currentInput = digit;
      waitingForOperand = false;
      justCalculated = false;
    } else if (currentInput === "0") {
      currentInput = digit;
    } else if (currentInput.length < MAX_INPUT_LENGTH) {
      currentInput += digit;
    }

    updateDisplay();
  }

  function inputDecimal() {
    if (justCalculated || waitingForOperand) {
      currentInput = "0.";
      waitingForOperand = false;
      justCalculated = false;
    } else if (currentInput.indexOf(".") === -1 && currentInput.length < MAX_INPUT_LENGTH) {
      currentInput += ".";
    }

    updateDisplay();
  }

  function calculate(first, second, operator) {
    if (operator === "+") { return first + second; }
    if (operator === "-") { return first - second; }
    if (operator === "*") { return first * second; }
    if (operator === "/") { return second === 0 ? null : first / second; }
    return second;
  }

  function chooseOperator(operator) {
    var inputValue = parseFloat(currentInput);

    if (selectedOperator && !waitingForOperand) {
      var intermediate = calculate(storedValue, inputValue, selectedOperator);
      if (intermediate === null) {
        showError("No se puede dividir entre cero");
        return;
      }
      currentInput = formatNumber(intermediate);
      storedValue = intermediate;
    } else {
      storedValue = inputValue;
    }

    selectedOperator = operator;
    waitingForOperand = true;
    justCalculated = false;
    updateDisplay();
  }

  function performCalculation() {
    if (storedValue === null || !selectedOperator || waitingForOperand) {
      return;
    }

    var secondValue = parseFloat(currentInput);
    var calculation = calculate(storedValue, secondValue, selectedOperator);
    var originalExpression = formatNumber(storedValue) + " " + operatorSymbol(selectedOperator) + " " + formatNumber(secondValue);

    if (calculation === null) {
      showError("No se puede dividir entre cero");
      return;
    }

    currentInput = formatNumber(calculation);
    expressionElement.textContent = originalExpression + " =";
    resultElement.textContent = currentInput;
    resultElement.classList.remove("is-error");
    addToHistory(originalExpression, currentInput);

    storedValue = null;
    selectedOperator = null;
    waitingForOperand = false;
    justCalculated = true;
  }

  function showError(message) {
    resetCalculator(false);
    expressionElement.textContent = "Operación no válida";
    updateDisplay(message);
  }

  function deleteLastDigit() {
    if (waitingForOperand || justCalculated) {
      return;
    }

    currentInput = currentInput.length > 1 ? currentInput.slice(0, -1) : "0";
    updateDisplay();
  }

  function resetCalculator(update) {
    currentInput = "0";
    storedValue = null;
    selectedOperator = null;
    waitingForOperand = false;
    justCalculated = false;

    if (update !== false) {
      updateDisplay();
    }
  }

  function addToHistory(expression, result) {
    var history = getHistory();
    history.unshift({ expression: expression, result: result });
    saveHistory(history.slice(0, 50));
    renderHistory();
  }

  function renderHistory() {
    var history = getHistory();
    historyList.innerHTML = "";

    for (var index = 0; index < history.length; index += 1) {
      var item = document.createElement("li");
      var expression = document.createElement("span");
      var result = document.createElement("strong");

      item.className = "history-item";
      expression.className = "history-expression";
      result.className = "history-result";
      expression.textContent = history[index].expression;
      result.textContent = "= " + history[index].result;
      item.appendChild(expression);
      item.appendChild(result);
      historyList.appendChild(item);
    }

    emptyHistory.hidden = history.length > 0;
    historyList.hidden = history.length === 0;
    clearHistoryButton.disabled = history.length === 0;
  }

  function clearHistory() {
    if (getHistory().length === 0) {
      return;
    }

    if (window.confirm("¿Deseas eliminar todo el historial de cálculos?")) {
      localStorage.removeItem(STORAGE_KEY);
      renderHistory();
    }
  }

  function flashKey(selector) {
    var key = document.querySelector(selector);
    if (!key) { return; }
    key.classList.add("is-pressed");
    window.setTimeout(function () { key.classList.remove("is-pressed"); }, 100);
  }

  keypad.addEventListener("click", function (event) {
    var button = event.target;
    while (button && button.tagName !== "BUTTON") {
      button = button.parentNode;
    }
    if (!button) { return; }

    var value = button.getAttribute("data-value");
    var action = button.getAttribute("data-action");

    if (/^[0-9]$/.test(value)) { inputDigit(value); }
    else if (value === ".") { inputDecimal(); }
    else if (/^[+\-*/]$/.test(value)) { chooseOperator(value); }
    else if (action === "equals") { performCalculation(); }
    else if (action === "clear") { resetCalculator(); }
    else if (action === "delete") { deleteLastDigit(); }
  });

  document.addEventListener("keydown", function (event) {
    var key = event.key;

    if (/^[0-9]$/.test(key)) {
      inputDigit(key);
      flashKey('[data-value="' + key + '"]');
    } else if (key === "." || key === ",") {
      inputDecimal();
      flashKey('[data-value="."]');
    } else if (/^[+\-*/]$/.test(key)) {
      chooseOperator(key);
      flashKey('[data-value="' + key + '"]');
    } else if (key === "Enter" || key === "=") {
      event.preventDefault();
      performCalculation();
      flashKey('[data-action="equals"]');
    } else if (key === "Backspace") {
      deleteLastDigit();
      flashKey('[data-action="delete"]');
    } else if (key === "Escape" || key === "Delete") {
      resetCalculator();
      flashKey('[data-action="clear"]');
    } else {
      return;
    }

    event.preventDefault();
  });

  clearHistoryButton.addEventListener("click", clearHistory);
  renderHistory();
  updateDisplay();
}());
