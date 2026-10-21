const SUBMISSION_ENDPOINT = "";

const form = document.querySelector("#delivery-form");
const phoneInput = document.querySelector("#phone");
const postalCodeInput = document.querySelector("#postal-code");
const cityInput = document.querySelector("#city");
const stateInput = document.querySelector("#state");
const streetInput = document.querySelector("#street");
const submitButton = document.querySelector("#submit-button");
const formMessage = document.querySelector("#form-message");
let isSubmitting = false;

function digitsOnly(value) {
  return value.replace(/\D/g, "");
}

function formatPhone(value) {
  const digits = digitsOnly(value).slice(0, 11);

  if (digits.length <= 2) {
    return digits.length ? `(${digits}` : "";
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function formatPostalCode(value) {
  const digits = digitsOnly(value).slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function showMessage(message, kind) {
  formMessage.textContent = message;
  formMessage.className = `form-message form-message--${kind}`;
  formMessage.hidden = false;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.hidden = true;
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.classList.toggle("is-loading", isLoading);
  submitButton.querySelector(".button-label").textContent = isLoading
    ? "Enviando..."
    : "Continuar";
}

function validateField(field) {
  const value = field.value.trim();
  let message = "";

  if (field.required && !value) {
    message = "Este campo é obrigatório.";
  } else if (field === phoneInput && value && ![10, 11].includes(digitsOnly(value).length)) {
    message = "Informe um telefone com DDD e 10 ou 11 dígitos.";
  } else if (field === postalCodeInput && value && digitsOnly(value).length !== 8) {
    message = "Informe um CEP válido com 8 dígitos.";
  } else if (field.type === "email" && value && field.validity.typeMismatch) {
    message = "Informe um e-mail válido, como nome@exemplo.com.";
  }

  field.setCustomValidity(message);
  field.setAttribute("aria-invalid", String(Boolean(message)));
  return !message;
}

function validateForm() {
  let isValid = true;
  const fields = [...form.querySelectorAll("input, select")];

  for (const field of fields) {
    if (!validateField(field)) {
      isValid = false;
    }
  }

  if (!isValid) {
    form.reportValidity();
  }
  return isValid;
}

async function fillAddressFromPostalCode() {
  const postalCode = digitsOnly(postalCodeInput.value);
  if (postalCode.length !== 8) {
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`);
    if (!response.ok) {
      throw new Error("Não foi possível consultar o CEP agora.");
    }

    const address = await response.json();
    if (address.erro) {
      showMessage("CEP não encontrado. Confira o número ou preencha o endereço manualmente.", "error");
      return;
    }

    cityInput.value = address.localidade || "";
    stateInput.value = address.uf || "";
    streetInput.value = address.logradouro || "";
    for (const field of [cityInput, stateInput, streetInput]) {
      validateField(field);
    }
    clearMessage();
  } catch {
    showMessage("Não foi possível consultar o CEP. Você pode preencher o endereço manualmente.", "error");
  }
}

phoneInput.addEventListener("input", () => {
  phoneInput.value = formatPhone(phoneInput.value);
  validateField(phoneInput);
});

postalCodeInput.addEventListener("input", () => {
  postalCodeInput.value = formatPostalCode(postalCodeInput.value);
  validateField(postalCodeInput);
  if (digitsOnly(postalCodeInput.value).length === 8) {
    fillAddressFromPostalCode();
  }
});

postalCodeInput.addEventListener("blur", fillAddressFromPostalCode);

form.addEventListener("input", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) {
    validateField(event.target);
    clearMessage();
  }
});

form.addEventListener("change", (event) => {
  if (event.target instanceof HTMLSelectElement) {
    validateField(event.target);
    clearMessage();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting) {
    return;
  }
  clearMessage();

  if (!validateForm()) {
    return;
  }

  if (!SUBMISSION_ENDPOINT) {
    showMessage(
      "Seus dados foram validados, mas ainda não foram enviados: esta página não está conectada a um servidor.",
      "error",
    );
    return;
  }

  isSubmitting = true;
  setLoading(true);
  try {
    const formData = Object.fromEntries(new FormData(form).entries());
    const response = await fetch(SUBMISSION_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("O servidor não confirmou o recebimento dos dados.");
    }

    if (!response.ok || result.success !== true) {
      throw new Error(
        typeof result.message === "string"
          ? result.message
          : "O servidor não confirmou o recebimento dos dados. Tente novamente.",
      );
    }

    showMessage("Dados recebidos com sucesso. Obrigado!", "success");
    form.reset();
  } catch (error) {
    showMessage(
      error instanceof Error
        ? error.message
        : "Não foi possível enviar os dados. Tente novamente.",
      "error",
    );
  } finally {
    isSubmitting = false;
    setLoading(false);
  }
});
