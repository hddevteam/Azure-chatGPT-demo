const promptImpersonate = 'You are an AI assistant that helps people find information.';
const messagesContainer = document.querySelector('#messages');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const tokensSpan = document.querySelector('#tokens');

// first load prompt repo from /api/prompt_repo it looks like this:
// [  
//     {  
//       "name": "AI",  
//       "icon": "fa-robot",  
//       "displayName": "AI",  
//       "prompt": "You are an AI assistant that helps people find information."  
//     }
//...]
// get the profile data
// then generate menu items from it to menu_list
// and add click event listener 
// to each menu item
// when click, get the profile data
const menuList = document.querySelector('#menu-list');
fetch('/api/prompt_repo')
    .then(response => response.json())
    .then(data => {
        const profiles = data;
        data.forEach(item => {
            let li = document.createElement('li');
            li.dataset.profile = item.name;
            let icon = document.createElement('i');
            icon.className = `fas ${item.icon}`;
            let span = document.createElement('span');
            span.textContent = item.displayName;
            li.appendChild(icon);
            li.appendChild(span);
            menuList.appendChild(li);
            //add click event listener
            li.addEventListener('click', function () {
                // 获取与该列表项关联的 profile 数据  
                var profileName = this.getAttribute('data-profile');
                var profile = profiles.find(function (p) { return p.name === profileName; });
                // 显示 profile 数据  
                addMessage('system', profile.prompt);
                // 清空 prompts 数组
                prompts.splice(0, prompts.length);
                prompts.push({ role: 'system', content: profile.prompt });
                sendMessage('Hi!');
            });
        });
    });


// Add message to DOM
const addMessage = (sender, message) => {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');
    messageElement.classList.add(`${sender}-message`);
    //if send is user
    if (sender === 'user') {
        const pre = document.createElement('pre');
        pre.innerText = message;
        messageElement.appendChild(pre);
    } else {
        messageElement.innerHTML = marked.parse(message);
    }
    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

let tokens = 0
let prompts = [{ role: 'system', content: promptImpersonate }];
addMessage('system', promptImpersonate);


// Clear message input
const clearMessage = () => {
    messagesContainer.innerHTML = '';
    messageInput.value = '';
    prompts.splice(0, prompts.length, { role: 'system', content: promptImpersonate });
};


// Send message on button click
const sendMessage = async (message = '') => {
    if (message === '/clear') {
        clearMessage();
        return;
    }
    // if message look like: /system: xxx, then send xxx as system message
    if (message.startsWith('/system')) {
        message = message.replace('/system', '');
        addMessage('system', message);
        prompts.splice(0, prompts.length);
        prompts.push({ role: 'system', content: message });
        sendMessage('Hi!');
        return;
    }
    addMessage('user', message);
    prompts.push({ role: 'user', content: message });
    const promptText = JSON.stringify(prompts);
    console.log(promptText);
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
            // If too many prompts, pop first two prompts
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