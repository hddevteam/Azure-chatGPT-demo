const promptImpersonate = 'You are an AI assistant that helps people find information.';
const messagesContainer = document.querySelector('#messages');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const tokensSpan = document.querySelector('#tokens');
const profiles = [
    { name: "AI", description: "You are an AI assistant that helps people find information." },
    { name: "Designer", description: "I want you to act as a UX/UI developer. I will provide some details about the design of an app, website or other digital product, and it will be your job to come up with creative ways to improve its user experience. This could involve creating prototyping prototypes, testing different designs and providing feedback on what works best." },
    { name: "Writer", description: "As a writing improvement assistant, your task is to improve the spelling, grammar, clarity, concision, and overall readability of the text provided, while breaking down long sentences, reducing repetition, and providing suggestions for improvement. Please provide only the corrected Chinese version of the text and avoid including explanations. " },
    { name: "Reviewer", description: "I want you to act as a commit message generator. I will provide you with information about the task and the prefix for the task code, and I would like you to generate an appropriate commit message using the conventional commit format. Do not write any explanations or other words, just reply with the commit message." },
    { name: "Code Interpreter", description: "I would like you to serve as a code interpreter, elucidate the syntax and the semantics of the code."}
]

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
    messageElement.innerText = message;
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

let tokens = 0
let prompts = [{ role: 'system', content: promptImpersonate }];
addMessage('system', promptImpersonate);
// 获取所有列表项  
var menuItems = document.querySelectorAll('div#menu ul li');

// 为每个列表项添加点击事件侦听器  
menuItems.forEach(function (item) {
    item.addEventListener('click', function () {
        // 获取与该列表项关联的 profile 数据  
        var profileName = item.getAttribute('data-profile');
        var profile = profiles.find(function (p) { return p.name === profileName; });
        // 显示 profile 数据  
        addMessage('system', profile.description);
        // 清空 prompts 数组
        prompts.splice(0, prompts.length);
        prompts.push({ role: 'system', content: profile.description });
    });
});


// Clear message input
const clearMessage = () => {
    messagesContainer.innerHTML = '';
    messageInput.value = '';
    prompts.splice(0, prompts.length, { role: 'system', content: promptImpersonate });
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