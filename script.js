// Data persistence helper using localStorage
const AppData = {
    save: (data) => {
        const currentData = JSON.parse(localStorage.getItem('loanAppData') || '{}');
        const newData = { ...currentData, ...data };
        localStorage.setItem('loanAppData', JSON.stringify(newData));
    },
    get: () => {
        return JSON.parse(localStorage.getItem('loanAppData') || '{}');
    },
    clear: () => {
        localStorage.removeItem('loanAppData');
    },
    formatToDisplay: (phone) => {
        if (!phone) return '';
        // Remove +233 and ensure it starts with 0
        let cleaned = phone.replace('+233', '');
        if (!cleaned.startsWith('0')) {
            cleaned = '0' + cleaned;
        }
        return cleaned;
    }
};

// Common UI updates
function updateHeaderLogo() {
    const logos = document.querySelectorAll('.header-logo-container');
    logos.forEach(container => {
        container.innerHTML = `
            <img src="assets/at-logo.jpg" alt="at logo" class="w-12 h-12 rounded-full object-cover mr-3 border-2 border-white shadow-sm">
            <span class="text-xl font-bold text-at-blue">Airteltigo</span>
        `;
    });
}

document.addEventListener('DOMContentLoaded', updateHeaderLogo);
