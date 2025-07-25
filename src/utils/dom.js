// DOM utility functions
export function createDOMElement(tag, attributes = {}) {
  const element = document.createElement(tag);

  // Handle null or undefined attributes
  if (!attributes) {
    return element;
  }

  Object.entries(attributes).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return; // Skip null/undefined values
    }

    if (key === 'className') {
      element.className = value;
    } else if (key === 'textContent') {
      element.textContent = value;
    } else if (key === 'innerHTML') {
      element.innerHTML = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      // Handle event listeners
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value);
    } else if (typeof value === 'boolean') {
      // Handle boolean attributes
      if (value) {
        element.setAttribute(key, key);
        element[key] = true;
      } else {
        element[key] = false;
      }
    } else {
      element.setAttribute(key, value);
    }
  });

  return element;
}

export function removeElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element);
  }
}

export function addClass(element, className) {
  element.classList.add(className);
}

export function removeClass(element, className) {
  element.classList.remove(className);
}

export function toggleClass(element, className) {
  element.classList.toggle(className);
}
