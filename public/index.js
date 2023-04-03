const promptImpersonate = 'You are an AI assistant that helps people find information.';
const aiProfile = document.querySelector('#ai-profile');
const messagesContainer = document.querySelector('#messages');
const messageForm = document.querySelector('#message-form');
const messageInput = document.querySelector('#message-input');
const tokensSpan = document.querySelector('#tokens');
const max_tokens = 4000;
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
        renderMenuList(data);
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
            tokens = data.totalTokens;
            tokensSpan.textContent = tokens;
            // If tokens are over 80% of max_tokens, remove the first round conversation
            if (tokens > max_tokens * 0.8) {
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

// 获取模态对话框元素和触发器元素
const modal = document.querySelector('.modal');
const usernameLabel = document.querySelector('#username-label');

const userForm = document.querySelector('#user-form');
const usernameInput = document.querySelector('#username-input');

// request /api/prompt_repo build queryString to transfer usernameInput value as username to server
// it will return a json object with username and a data array
// output the data array and the username in console
userForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const username = usernameInput.value.trim();
    modal.style.display = 'none';
    if (username) {
        fetch(`/api/prompt_repo?username=${username}`)
            .then(response => response.json())
            .then(data => {
                renderMenuList(data);
            });
    }
});


// 当点击触发器时显示模态对话框
usernameLabel.addEventListener('click', function () {
    modal.style.display = 'block';
});

// 当用户点击模态对话框之外的区域时隐藏模态对话框
window.addEventListener('click', function (event) {
    if (event.target == modal) {
        modal.style.display = 'none';
    }
});

// render menu list from data
function renderMenuList(data) {
    const profiles = data.profiles;
    //empty menu list
    menuList.innerHTML = '';
    usernameLabel.textContent = data.username;
    //add menu items
    profiles.forEach(item => {
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
            // 设置 profile 图标和名称
            aiProfile.innerHTML = `<i class="fas ${profile.icon}"></i> ${profile.displayName}`;
            // 显示 profile 数据  
            addMessage('system', profile.prompt);
            // 清空 prompts 数组
            prompts.splice(0, prompts.length);
            prompts.push({ role: 'system', content: profile.prompt });
        });
    });
}
