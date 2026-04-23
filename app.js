// ===== app.js - Lista de Compras Avançada =====

// ===== CONSTANTES E CONFIGURAÇÕES =====
const CATEGORIES = {
    geral: { emoji: '📦', name: 'Geral', color: '#E2E8F0' },
    frutas: { emoji: '🍎', name: 'Frutas', color: '#FED7D7' },
    laticinios: { emoji: '🥛', name: 'Laticínios', color: '#FEFCBF' },
    limpeza: { emoji: '🧹', name: 'Limpeza', color: '#C6F6D5' },
    padaria: { emoji: '🥖', name: 'Padaria', color: '#FEEBC8' },
    acougue: { emoji: '🥩', name: 'Açougue', color: '#FED7E2' },
    bebidas: { emoji: '🥤', name: 'Bebidas', color: '#C4F1F9' },
    higiene: { emoji: '🧴', name: 'Higiene', color: '#E9D8FD' }
};

const SOUNDS = {
    add: null,
    remove: null,
    check: null
};

// ===== ESTADO GLOBAL =====
let currentList = 'principal';
let selectedCategory = 'geral';
let itemToDelete = null;
let lists = {
    principal: [],
    feira: [],
    farmacia: []
};
let itemHistory = [];

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    initSoundEffects();
    setupEventListeners();
    setupListaDelegation(); // NOVA: Configura delegação de eventos na lista
    renderCurrentList();
    updateItemCount();
    updateSyncIndicator();
    
    // Observa mudanças na lista para estado vazio
    const lista = document.getElementById('lista');
    if (lista) {
        const observer = new MutationObserver(updateEmptyState);
        observer.observe(lista, { childList: true, subtree: true });
    }
});

// ===== PERSISTÊNCIA DE DADOS =====
function loadData() {
    try {
        const savedLists = localStorage.getItem('shoppingLists');
        if (savedLists) {
            lists = JSON.parse(savedLists);
        }
        
        const savedHistory = localStorage.getItem('itemHistory');
        if (savedHistory) {
            itemHistory = JSON.parse(savedHistory);
        }
        
        const savedCurrentList = localStorage.getItem('currentList');
        if (savedCurrentList) {
            currentList = savedCurrentList;
        }
    } catch (e) {
        console.error('Erro ao carregar dados:', e);
        showToast('Erro ao carregar dados', 'error');
    }
}

function saveData() {
    try {
        localStorage.setItem('shoppingLists', JSON.stringify(lists));
        localStorage.setItem('itemHistory', JSON.stringify(itemHistory));
        localStorage.setItem('currentList', currentList);
        updateSyncIndicator();
    } catch (e) {
        console.error('Erro ao salvar dados:', e);
        showToast('Erro ao salvar dados', 'error');
    }
}

// ===== EFEITOS SONOROS =====
function initSoundEffects() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        SOUNDS.add = () => playTone(audioCtx, 800, 0.1, 'sine');
        SOUNDS.remove = () => playTone(audioCtx, 300, 0.15, 'triangle');
        SOUNDS.check = () => playTone(audioCtx, 600, 0.08, 'sine');
    } catch (e) {
        SOUNDS.add = SOUNDS.remove = SOUNDS.check = () => {};
    }
}

function playTone(ctx, frequency, duration, type) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
}

// ===== SISTEMA DE TOAST =====
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close">&times;</button>
    `;
    
    // Evento para fechar o toast
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.remove('toast-visible');
        setTimeout(() => toast.remove(), 300);
    });
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('toast-visible');
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }
    }, 3000);
}

// ===== MODAL DE CONFIRMAÇÃO =====
function showConfirmModal(message, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    const messageEl = document.getElementById('confirm-message');
    const confirmBtn = document.getElementById('confirm-ok');
    const cancelBtn = document.getElementById('confirm-cancel');
    
    if (!modal || !messageEl || !confirmBtn || !cancelBtn) {
        // Fallback: executar diretamente se modal não existir
        if (confirm(message)) {
            onConfirm();
        }
        return;
    }
    
    messageEl.textContent = message;
    modal.style.display = 'flex';
    
    const closeModal = () => {
        modal.style.display = 'none';
        document.removeEventListener('keydown', escHandler);
    };
    
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            closeModal();
        }
    };
    
    // Remove listeners antigos
    confirmBtn.replaceWith(confirmBtn.cloneNode(true));
    cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    
    // Pega os novos elementos
    const newConfirmBtn = document.getElementById('confirm-ok');
    const newCancelBtn = document.getElementById('confirm-cancel');
    
    newConfirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal();
    });
    
    newCancelBtn.addEventListener('click', closeModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });
    
    document.addEventListener('keydown', escHandler);
}

// ===== DELEGAÇÃO DE EVENTOS NA LISTA (CORRIGIDO) =====
function setupListaDelegation() {
    const lista = document.getElementById('lista');
    if (!lista) return;
    
    // Remove listener antigo se existir
    lista.removeEventListener('click', handleListaClick);
    // Adiciona novo listener
    lista.addEventListener('click', handleListaClick);
    
    // Também configura dblclick para edição
    lista.addEventListener('dblclick', handleListaDblClick);
}

function handleListaClick(e) {
    // Encontra o item-card mais próximo
    const itemCard = e.target.closest('.item-card');
    if (!itemCard) return;
    
    const itemId = parseInt(itemCard.dataset.id);
    if (!itemId) return;
    
    // Verifica qual botão foi clicado
    const deleteBtn = e.target.closest('.btn-delete');
    const editBtn = e.target.closest('.btn-edit');
    const checkbox = e.target.closest('.checkbox-input');
    
    if (deleteBtn) {
        // Clique no botão deletar
        e.preventDefault();
        e.stopPropagation();
        removerItem(itemId);
    } else if (editBtn) {
        // Clique no botão editar
        e.preventDefault();
        e.stopPropagation();
        editarItem(itemId);
    } else if (checkbox) {
        // Clique no checkbox
        toggleItem(itemId);
    }
}

function handleListaDblClick(e) {
    const itemCard = e.target.closest('.item-card');
    if (!itemCard) return;
    
    // Só ativa edição se clicou no texto ou emoji
    const textSpan = e.target.closest('.item-text');
    const emojiSpan = e.target.closest('.item-category-emoji');
    
    if (textSpan || emojiSpan) {
        const itemId = parseInt(itemCard.dataset.id);
        if (itemId) {
            editarItem(itemId);
        }
    }
}

// ===== GERENCIAMENTO DE LISTAS =====
function adicionarItem() {
    const input = document.getElementById('item');
    if (!input) return;
    
    const text = input.value.trim();
    
    if (!text) {
        showToast('Digite um item para adicionar', 'warning');
        input.focus();
        return;
    }
    
    const newItem = {
        id: Date.now(),
        text: text,
        checked: false,
        category: selectedCategory,
        createdAt: new Date().toISOString()
    };
    
    if (!lists[currentList]) {
        lists[currentList] = [];
    }
    
    lists[currentList].unshift(newItem);
    addToHistory(text);
    
    input.value = '';
    input.focus();
    
    saveData();
    renderCurrentList();
    updateItemCount();
    
    SOUNDS.add();
    showToast(`${CATEGORIES[selectedCategory].emoji} "${text}" adicionado!`, 'success');
}

function removerItem(itemId) {
    const item = lists[currentList]?.find(i => i.id === itemId);
    
    if (item) {
        showConfirmModal(
            `Tem certeza que deseja remover "${item.text}"?`,
            () => {
                if (lists[currentList]) {
                    lists[currentList] = lists[currentList].filter(i => i.id !== itemId);
                }
                saveData();
                renderCurrentList();
                updateItemCount();
                SOUNDS.remove();
                showToast('Item removido com sucesso', 'info');
            }
        );
    }
}

function toggleItem(itemId) {
    const item = lists[currentList]?.find(i => i.id === itemId);
    if (item) {
        item.checked = !item.checked;
        saveData();
        renderCurrentList();
        updateItemCount();
        
        if (item.checked) {
            SOUNDS.check();
        }
    }
}

function editarItem(itemId) {
    const item = lists[currentList]?.find(i => i.id === itemId);
    if (!item) return;
    
    const itemCard = document.querySelector(`[data-id="${itemId}"]`);
    if (!itemCard) return;
    
    const textSpan = itemCard.querySelector('.item-text');
    if (!textSpan) return;
    
    const originalText = item.text;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = originalText;
    input.className = 'item-edit-input';
    
    textSpan.replaceWith(input);
    input.focus();
    input.select();
    
    const saveEdit = () => {
        const newText = input.value.trim();
        if (newText && newText !== originalText) {
            item.text = newText;
            addToHistory(newText);
            saveData();
            showToast(`Item atualizado para "${newText}"`, 'success');
        }
        renderCurrentList();
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.value = originalText;
            input.blur();
        }
    });
}

// ===== HISTÓRICO E AUTOCOMPLETE =====
function addToHistory(text) {
    itemHistory = itemHistory.filter(i => i.toLowerCase() !== text.toLowerCase());
    itemHistory.unshift(text);
    if (itemHistory.length > 20) {
        itemHistory = itemHistory.slice(0, 20);
    }
}

function showSuggestions() {
    const input = document.getElementById('item');
    const container = document.getElementById('suggestions-container');
    const list = document.getElementById('suggestions-list');
    
    if (!input || !container || !list) return;
    
    const query = input.value.trim().toLowerCase();
    
    if (!query || itemHistory.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    const matches = itemHistory.filter(item => 
        item.toLowerCase().includes(query)
    ).slice(0, 5);
    
    if (matches.length === 0) {
        container.style.display = 'none';
        return;
    }
    
    list.innerHTML = matches.map(item => `
        <li class="suggestion-item" data-text="${escapeHtml(item)}">
            <span class="suggestion-icon">🕐</span>
            <span class="suggestion-text">${highlightMatch(escapeHtml(item), query)}</span>
        </li>
    `).join('');
    
    container.style.display = 'block';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function highlightMatch(text, query) {
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedQuery})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
}

function selectSuggestion(text) {
    const input = document.getElementById('item');
    const container = document.getElementById('suggestions-container');
    
    if (input) {
        input.value = text;
        input.focus();
    }
    
    if (container) {
        container.style.display = 'none';
    }
}

// ===== RENDERIZAÇÃO =====
function renderCurrentList() {
    const listaEl = document.getElementById('lista');
    if (!listaEl) return;
    
    const items = lists[currentList] || [];
    
    // Ordena: não checados primeiro, depois checados
    const sortedItems = [...items].sort((a, b) => {
        if (a.checked === b.checked) return 0;
        return a.checked ? 1 : -1;
    });
    
    listaEl.innerHTML = sortedItems.map(item => {
        const category = CATEGORIES[item.category] || CATEGORIES.geral;
        const checkedClass = item.checked ? 'checked' : '';
        
        return `
            <li class="item-card ${checkedClass}" 
                data-id="${item.id}" 
                style="border-left: 4px solid ${category.color}"
                data-category="${item.category}">
                
                <label class="item-checkbox">
                    <input type="checkbox" 
                           class="checkbox-input" 
                           ${item.checked ? 'checked' : ''}>
                    <span class="checkbox-custom"></span>
                    <span class="item-category-emoji">${category.emoji}</span>
                    <span class="item-text">${escapeHtml(item.text)}</span>
                </label>
                
                <div class="item-actions">
                    <button class="btn-edit" title="Editar item">✏️</button>
                    <button class="btn-delete" title="Remover item">🗑️</button>
                </div>
            </li>
        `;
    }).join('');
    
    // Reconfigura delegação de eventos após renderizar
    setupListaDelegation();
    
    updateEmptyState();
    updateItemCount();
}

function updateEmptyState() {
    const listaEl = document.getElementById('lista');
    const emptyState = document.getElementById('empty-state');
    
    if (listaEl && emptyState) {
        if (listaEl.children.length === 0) {
            emptyState.style.display = 'flex';
        } else {
            emptyState.style.display = 'none';
        }
    }
}

function updateItemCount() {
    const countEl = document.getElementById('itemCount');
    if (!countEl) return;
    
    const total = lists[currentList]?.length || 0;
    const pending = lists[currentList]?.filter(i => !i.checked).length || 0;
    countEl.textContent = `${pending} pendentes / ${total} total`;
}

function updateSyncIndicator() {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;
    
    const now = new Date();
    const timeString = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const textEl = indicator.querySelector('.sync-text');
    const dotEl = indicator.querySelector('.sync-dot');
    
    if (textEl) {
        textEl.textContent = `Sincronizado às ${timeString}`;
    }
    
    if (dotEl) {
        dotEl.style.backgroundColor = '#48BB78';
        setTimeout(() => {
            dotEl.style.backgroundColor = '#A0AEC0';
        }, 1000);
    }
}

// ===== SWIPE PARA REMOVER (MOBILE) =====
function setupSwipeListeners() {
    const lista = document.getElementById('lista');
    if (!lista) return;
    
    lista.addEventListener('touchstart', handleTouchStart, { passive: true });
    lista.addEventListener('touchmove', handleTouchMove, { passive: false });
    lista.addEventListener('touchend', handleTouchEnd);
}

let touchStartX = 0;
let touchCurrentX = 0;
let swipingItem = null;

function handleTouchStart(e) {
    const itemCard = e.target.closest('.item-card');
    if (!itemCard) return;
    
    touchStartX = e.touches[0].clientX;
    touchCurrentX = touchStartX;
    swipingItem = itemCard;
}

function handleTouchMove(e) {
    if (!swipingItem) return;
    
    touchCurrentX = e.touches[0].clientX;
    const deltaX = touchCurrentX - touchStartX;
    
    if (deltaX < 0 && deltaX > -120) {
        swipingItem.style.transform = `translateX(${deltaX}px)`;
        swipingItem.style.opacity = 1 - Math.abs(deltaX) / 200;
    }
}

function handleTouchEnd() {
    if (!swipingItem) return;
    
    const deltaX = touchCurrentX - touchStartX;
    
    if (deltaX < -80) {
        const itemId = parseInt(swipingItem.dataset.id);
        if (itemId) {
            swipingItem.style.transition = 'all 0.3s ease';
            swipingItem.style.transform = 'translateX(-120%)';
            swipingItem.style.opacity = '0';
            swipingItem.style.maxHeight = '0';
            swipingItem.style.marginBottom = '0';
            swipingItem.style.padding = '0';
            
            setTimeout(() => {
                removerItem(itemId);
            }, 300);
        }
    } else {
        swipingItem.style.transition = 'all 0.3s ease';
        swipingItem.style.transform = 'translateX(0)';
        swipingItem.style.opacity = '1';
    }
    
    swipingItem = null;
    touchStartX = 0;
    touchCurrentX = 0;
}

// ===== MÚLTIPLAS LISTAS =====
function switchList(listName) {
    currentList = listName;
    
    document.querySelectorAll('.tab-btn[data-list]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.list === listName);
    });
    
    saveData();
    renderCurrentList();
    updateItemCount();
}

function addNewList() {
    const name = prompt('Nome da nova lista:');
    if (!name) return;
    
    const listKey = name.toLowerCase().replace(/\s+/g, '-');
    
    if (lists[listKey]) {
        showToast('Já existe uma lista com esse nome', 'warning');
        return;
    }
    
    lists[listKey] = [];
    
    const tabsContainer = document.getElementById('listTabs');
    const addBtn = document.getElementById('addTabBtn');
    
    if (tabsContainer && addBtn) {
        const emoji = '📋';
        
        const newTab = document.createElement('button');
        newTab.className = 'tab-btn';
        newTab.dataset.list = listKey;
        newTab.textContent = `${emoji} ${name}`;
        newTab.addEventListener('click', () => switchList(listKey));
        
        tabsContainer.insertBefore(newTab, addBtn);
    }
    
    saveData();
    switchList(listKey);
    showToast(`Lista "${name}" criada!`, 'success');
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
    const itemInput = document.getElementById('item');
    const suggestionsList = document.getElementById('suggestions-list');
    const suggestionsContainer = document.getElementById('suggestions-container');
    
    // Enter para adicionar
    if (itemInput) {
        itemInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                adicionarItem();
            }
            
            setTimeout(showSuggestions, 100);
        });
        
        // Mostrar sugestões ao focar
        itemInput.addEventListener('focus', () => {
            setTimeout(showSuggestions, 100);
        });
    }
    
    // Botão Adicionar
    const btnAdd = document.getElementById('btnAdd');
    if (btnAdd) {
        btnAdd.addEventListener('click', adicionarItem);
    }
    
    // Fechar sugestões ao clicar fora
    document.addEventListener('click', (e) => {
        if (suggestionsContainer && 
            !e.target.closest('#suggestions-container') && 
            !e.target.closest('#item')) {
            suggestionsContainer.style.display = 'none';
        }
    });
    
    // Clique em sugestão
    if (suggestionsList) {
        suggestionsList.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item) {
                selectSuggestion(item.dataset.text);
            }
        });
    }
    
    // Seletor de categoria
    document.querySelectorAll('.category-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedCategory = chip.dataset.category;
            
            if (itemInput) itemInput.focus();
        });
    });
    
    // Tabs de listas
    document.querySelectorAll('.tab-btn[data-list]').forEach(tab => {
        tab.addEventListener('click', () => switchList(tab.dataset.list));
    });
    
    // Botão adicionar nova lista
    const addTabBtn = document.getElementById('addTabBtn');
    if (addTabBtn) {
        addTabBtn.addEventListener('click', addNewList);
    }
    
    // Swipe para mobile
    setupSwipeListeners();
    
    // Atalhos de teclado
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (itemInput) itemInput.focus();
        }
    });
}

// ===== FUNÇÕES GLOBAIS (COMPATIBILIDADE) =====
// Estas funções são expostas globalmente para compatibilidade com onclick
window.adicionarItem = adicionarItem;
window.removerItem = removerItem;
window.toggleItem = toggleItem;
window.editarItem = editarItem;

window.logout = window.logout || function() {
    showConfirmModal('Tem certeza que deseja sair?', () => {
        window.location.href = 'login.html';
    });
};

window.cadastro = window.cadastro || function() {
    showToast('Função de cadastro será implementada', 'info');
};