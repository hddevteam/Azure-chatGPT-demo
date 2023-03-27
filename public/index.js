const promptImpersonate = 'You are an AI assistant that helps people find information.';
const messagesContainer = document.querySelector('#messages');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const tokensSpan = document.querySelector('#tokens');  
let tokens = 0
let prompts = [{ role: 'system', content: promptImpersonate }];
// Clear message input
const clearMessage = () => {
    messagesContainer.innerHTML = '';
    messageInput.value = '';
    prompts.splice(0, prompts.length, { role: 'system', content: promptImpersonate });
};

// Add message to DOM
const addMessage = (sender, message) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(`${sender}-message`);
    const codeBlocks = message.match(/```(\w+)?\n([\s\S]+?)\n```/g);
    if (codeBlocks) {
        codeBlocks.forEach((block) => {
            const code = block.replace(/```(\w+)?\n([\s\S]+?)\n```/, '$2');
            const pre = document.createElement('pre');
            const codeElement = document.createElement('code');
            codeElement.innerText = code;
            pre.appendChild(codeElement);
            message = message.replace(block, pre.outerHTML);
        });
    }
    messageElement.innerHTML = message.replace(/\n/g, '<br>');
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

// Send message on button click
const sendMessage = async (message = '') => {
    if (message === 'clear') {
        clearMessage();
        return;
    }
    addMessage('user', message);
    prompts.push({ role: 'user', content: message });
    const promptText = JSON.stringify(prompts);
    messageInput.value = '';
    try {
        const response = await fetch('/api/gpt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptText }),
        });
        if (!response.ok) {
            throw new Error('Error generating response.');
        }
        const data = await response.json();
        console.log(data);
        // If no response, pop last prompt and send a message
        if (!data) {
            prompts.pop();
            message = 'AI没有返回结果，请再说一下你的问题，或者换个问题问我吧。';
        } else {
            prompts.push({ role: 'assistant', content: data.message });
            tokens += data.totalTokens;
            tokensSpan.textContent = tokens;
            // If too many prompts, pop first two prompts and send a message
            if (prompts.length > 6) {
                prompts.splice(1, 2);
                prompts[0] = { role: 'system', content: promptImpersonate };
            }
        }
        addMessage('bot', data.message);
    } catch (error) {
        addMessage('bot', error.message);
    }
};

// Send message on form submit
messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const message = messageInput.value.trim();
    if (message) {
        sendMessage(message);
    }
});

messageInput.focus();