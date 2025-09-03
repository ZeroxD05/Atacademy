const cart = [];
const cartBtn = document.getElementById("cartBtn");
const cartSidebar = document.getElementById("cartSidebar");
const overlay = document.getElementById("overlay");
const closeCart = document.getElementById("closeCart");
const cartItems = document.getElementById("cartItems");
const cartCount = document.getElementById("cartCount");
const addToCartBtns = document.querySelectorAll(".add-to-cart-btn");
const checkoutBtn = document.getElementById("checkoutBtn");

// Öffnen/Schließen Warenkorb
cartBtn.onclick = () => {
  cartSidebar.classList.add("open");
  overlay.classList.add("active");
};
closeCart.onclick = () => {
  cartSidebar.classList.remove("open");
  overlay.classList.remove("active");
};
overlay.onclick = () => {
  cartSidebar.classList.remove("open");
  overlay.classList.remove("active");
};

// Produkt hinzufügen
addToCartBtns.forEach((btn) => {
  btn.onclick = function () {
    const card = btn.closest(".product-card");
    const id = card.dataset.id;
    const title = card.dataset.title;
    const price = parseFloat(card.dataset.price);
    const existing = cart.find((item) => item.id === id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ id, title, price, qty: 1 });
    }
    updateCart();
    cartSidebar.classList.add("open");
    overlay.classList.add("active");
  };
});

// Warenkorb aus Local Storage laden
function loadCart() {
  const saved = localStorage.getItem("cart");
  if (saved) {
    try {
      const arr = JSON.parse(saved);
      if (Array.isArray(arr)) {
        cart.length = 0;
        cart.push(...arr);
      }
    } catch (e) {}
  }
}

// Warenkorb in Local Storage speichern
function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

// updateCart anpassen: nach jedem Update speichern
function updateCart() {
  cartItems.innerHTML = "";
  cartCount.textContent = `(${cart.reduce((sum, item) => sum + item.qty, 0)})`;
  saveCart();
  if (cart.length === 0) {
    cartItems.innerHTML = "<p>Dein Warenkorb ist leer.</p>";
    return;
  }
  let total = 0;
  const table = document.createElement("table");
  table.style.width = "100%";
  table.innerHTML = `
    <thead>
      <tr>
        <th style="text-align:left;">Produkt</th>
        <th style="text-align:center;">Menge</th>
        <th style="text-align:right;">Preis</th>
        <th></th>
      </tr>
    </thead>
    <tbody></tbody>
  `;
  // Hilfsfunktion für Preisformatierung ohne .00
  function formatPrice(val) {
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2).replace(".", ",");
  }
  cart.forEach((item) => {
    total += item.price * item.qty;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.title}</td>
      <td style="text-align:center;">
        <div class="qty-vertical">
          <button class="qty-btn" data-id="${
            item.id
          }" data-action="plus">+</button>
          <span style="margin:4px 0;">${item.qty}</span>
          <button class="qty-btn" data-id="${
            item.id
          }" data-action="minus">−</button>
        </div>
      </td>
      <td style="text-align:right; vertical-align:middle;">${formatPrice(
        item.price * item.qty
      )} €</td>
      <td style="vertical-align:middle;"><button class="remove-cart-item" data-id="${
        item.id
      }">✖</button></td>
    `;
    table.querySelector("tbody").appendChild(row);
  });
  cartItems.appendChild(table);

  // Gesamtpreis und rechtlicher Hinweis
  const totalDiv = document.createElement("div");
  totalDiv.className = "cart-total-info";
  totalDiv.innerHTML = `
    <div class="cart-total" style="margin-top:10px;">Gesamt: ${formatPrice(
      total
    )} €</div>
    <div class="cart-legal">Alle Preise inkl. gesetzl. MwSt.</div>
  `;
  cartItems.appendChild(totalDiv);

  // Entfernen-Button
  document.querySelectorAll(".remove-cart-item").forEach((btn) => {
    btn.onclick = function () {
      const id = btn.dataset.id;
      const idx = cart.findIndex((item) => item.id === id);
      if (idx > -1) cart.splice(idx, 1);
      updateCart();
    };
  });

  // Mengen-Buttons
  document.querySelectorAll(".qty-btn").forEach((btn) => {
    btn.onclick = function () {
      const id = btn.dataset.id;
      const action = btn.dataset.action;
      const item = cart.find((i) => i.id === id);
      if (!item) return;
      if (action === "plus") item.qty += 1;
      if (action === "minus" && item.qty > 1) item.qty -= 1;
      updateCart();
    };
  });
}

// Stripe Checkout (Demo, Backend nötig!)
checkoutBtn.onclick = async function () {
  if (cart.length === 0) return alert("Warenkorb ist leer!");
  // Hier würdest du die cart-Daten an dein Backend schicken und Stripe Checkout starten
  alert("Stripe Checkout würde jetzt starten (Demo)");
  // Beispiel für Stripe Checkout mit Backend:
  // fetch('/create-checkout-session', { method: 'POST', body: JSON.stringify(cart) })
  //   .then(res => res.json())
  //   .then(data => window.location.href = data.checkoutUrl);
};

// --- Produkte Dots ---
const productScroll = document.getElementById("productScroll");
const productDotsWrap = document.getElementById("productDots");
const productDots = productDotsWrap?.children;

if (window.innerWidth < 1024) {
  productScroll.addEventListener("scroll", () => {
    const scrollPos = productScroll.scrollLeft;
    const cardWidth = productScroll.children[0].offsetWidth + 16; // inkl. gap
    const index = Math.round(scrollPos / cardWidth);

    for (let i = 0; i < productDots.length; i++) {
      productDots[i].classList.remove("active");
    }
    productDots[index]?.classList.add("active");
  });
} else {
  // Auf Desktop keine Dots nötig
  productDotsWrap.style.display = "none";
}

// --- FAQ Akkordeon ---
const faqItems = document.querySelectorAll(".faq-item");

// FAQ: Öffnen/Schließen beim Klick
document.querySelectorAll(".faq-question").forEach((btn) => {
  btn.addEventListener("click", function () {
    const item = btn.closest(".faq-item");
    // Toggle: Schließe, wenn schon offen
    item.classList.toggle("active");
  });
});

// --- Back-to-top (nur Mobile) ---
const backToTop = document.getElementById("backToTop");

// Show/Hide je nach Scrollposition (nur Mobile aktiv sinnvoll)
function toggleBackToTop() {
  const isMobile = window.innerWidth <= 768;
  if (!backToTop) return;

  if (isMobile && window.scrollY > 300) {
    backToTop.classList.add("show");
  } else {
    backToTop.classList.remove("show");
  }
}

window.addEventListener("scroll", toggleBackToTop);
window.addEventListener("resize", toggleBackToTop);
document.addEventListener("DOMContentLoaded", toggleBackToTop);

backToTop?.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

const header = document.querySelector("header");
window.addEventListener("scroll", () => {
  if (window.scrollY > 10) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

// Beim Laden der Seite Warenkorb laden
document.addEventListener("DOMContentLoaded", () => {
  loadCart();
  updateCart();
  toggleBackToTop();
});
