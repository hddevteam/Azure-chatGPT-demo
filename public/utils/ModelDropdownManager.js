// /utils/ModelDropdownManager.js

/**
 * 管理模型下拉菜单的类
 * 处理模型的选择、显示和样式变更
 */
export default class ModelDropdownManager {
    /**
     * @param {Object} app - 应用实例
     * @param {string} switchElementId - 模型切换按钮的选择器
     * @param {string} dropdownElementId - 模型下拉菜单的选择器
     */
    constructor(app, switchElementId, dropdownElementId) {
        this.app = app;
        this.switchElement = document.querySelector(switchElementId);
        this.dropdown = document.querySelector(dropdownElementId);
        
        // 支持的模型列表和它们的显示名称
        this.supportedModels = {
            "gpt-4o": "GPT-4O",
            "gpt-4o-mini": "GPT-4O-MINI",
            "o1": "O1",
            "o1-mini": "O1-MINI",
            "o3-mini": "O3-MINI" // 添加新的 o3-mini 模型
        };
        
        // 默认模型
        this.model = "gpt-4o"; 
        
        // 获取存储的模型或使用默认模型
        this.initFromStorage();
        
        // 设置下拉菜单交互
        this.setupDropdown();
    }
    
    /**
     * 从本地存储初始化模型
     */
    initFromStorage() {
        try {
            // 从localStorage中获取最后使用的模型
            const savedModel = localStorage.getItem("selectedModel");
            if (savedModel && this.supportedModels[savedModel]) {
                this.model = savedModel;
                this.updateUIForModel(this.model);
            }
        } catch (e) {
            console.error("Error loading model from storage:", e);
        }
    }
    
    /**
     * 更新UI以反映选择的模型
     * @param {string} model - 模型ID
     */
    updateUIForModel(model) {
        if (!this.supportedModels[model]) {
            console.warn(`Model ${model} not supported, using default`);
            model = "gpt-4o";
        }
        
        // 更新切换按钮文本
        this.switchElement.textContent = this.supportedModels[model];
        
        // 更新应用实例的模型
        this.app.model = model;
        
        // 移除所有模型类
        Object.keys(this.supportedModels).forEach(modelKey => {
            this.switchElement.classList.remove(modelKey);
        });
        
        // 添加当前模型类用于样式
        this.switchElement.classList.add(model);
        
        // 保存选择到本地存储
        try {
            localStorage.setItem("selectedModel", model);
        } catch (e) {
            console.warn("Unable to save model selection to storage:", e);
        }
    }
    
    /**
     * 设置下拉菜单的事件监听器
     */
    setupDropdown() {
        // 切换下拉菜单可见性
        this.switchElement.addEventListener("click", event => {
            event.stopPropagation();
            this.dropdown.classList.toggle("visible");
        });
        
        // 点击选项时更新模型
        this.dropdown.addEventListener("click", event => {
            const item = event.target;
            if(item.classList.contains("dropdown-item")) {
                const selectedModel = item.getAttribute("data-model");
                this.model = selectedModel;
                this.updateUIForModel(selectedModel);
            }
            this.dropdown.classList.remove("visible");
        });
        
        // 点击外部时隐藏下拉菜单
        document.addEventListener("click", event => {
            if(!this.dropdown.contains(event.target) && event.target !== this.switchElement) {
                this.dropdown.classList.remove("visible");
            }
        });
    }
    
    /**
     * 添加一个新模型到支持列表
     * @param {string} modelId - 模型ID
     * @param {string} displayName - 模型显示名称
     */
    addModel(modelId, displayName) {
        if (!modelId || !displayName) return;
        
        // 添加到支持列表
        this.supportedModels[modelId] = displayName;
        
        // 如果有必要，添加到下拉菜单
        const existingItem = Array.from(this.dropdown.children).find(
            child => child.getAttribute("data-model") === modelId
        );
        
        if (!existingItem) {
            const newItem = document.createElement("span");
            newItem.classList.add("dropdown-item");
            newItem.setAttribute("data-model", modelId);
            newItem.textContent = displayName;
            this.dropdown.appendChild(newItem);
        }
    }
    
    /**
     * 获取当前选择的模型
     * @returns {string} 当前模型ID
     */
    getSelectedModel() {
        return this.model;
    }
}
