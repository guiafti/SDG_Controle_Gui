// Mock do window.api para rodar a aplicação perfeitamente no navegador/Vercel (sem Electron)
if (typeof window !== 'undefined' && !window.api) {
  console.log('[BROWSER MOCK] Carregando simulador de banco de dados local (localStorage)...');

  // Helpers para persistência no LocalStorage
  const getStorage = <T>(key: string, defaultValue: T): T => {
    try {
      const data = localStorage.getItem(`sdg_${key}`);
      return data ? JSON.parse(data) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const setStorage = <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(`sdg_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('[BROWSER MOCK] Erro ao gravar no localStorage:', e);
    }
  };

  // Valores padrão
  const defaultStores = [
    { id: '1', name: 'LOJA CENTRO', archived: 0 },
    { id: '2', name: 'LOJA AVENIDA', archived: 0 },
    { id: '3', name: 'LOJA SHOPPING', archived: 0 }
  ];

  const defaultUsers = [
    { id: 'admin-id', name: 'Admin', password: 'admin', role: 'admin' },
    { id: 'vendedor-id', name: 'Vendedor', password: '123', role: 'vendedor' }
  ];

  const defaultSettings = [
    { key: 'company_name', value: 'SDG CONTROLE' },
    { key: 'interface', value: 'COM1' }
  ];

  const defaultProducts = [
    { id: 'p1', barcode: '7891000000001', name: 'IPHONE 13 PRO MAX', price: 4999.90, cost_price: 3500.00, archived: 0, image: null, category_id: 'ESTOQUE' },
    { id: 'p2', barcode: '7891000000002', name: 'PELICULA DE VIDRO 3D', price: 29.90, cost_price: 5.00, archived: 0, image: null, category_id: 'ESTOQUE' },
    { id: 'p3', barcode: '7891000000003', name: 'CAPINHA SILICONE TRANSPARENTE', price: 39.90, cost_price: 8.00, archived: 0, image: null, category_id: 'ESTOQUE' },
    { id: 'p4', barcode: '7891000000004', name: 'CARREGADOR TURBO TYPE-C 20W', price: 99.90, cost_price: 30.00, archived: 0, image: null, category_id: 'ESTOQUE' }
  ];

  const defaultCategories = [
    { id: 'c1', name: 'ESTOQUE' },
    { id: 'c2', name: 'ALUGUEL' },
    { id: 'c3', name: 'ENERGIA' },
    { id: 'c4', name: 'ÁGUA' },
    { id: 'c5', name: 'INTERNET' },
    { id: 'c6', name: 'SALÁRIOS' },
    { id: 'c7', name: 'MARKETING' },
    { id: 'c8', name: 'MANUTENÇÃO' },
    { id: 'c9', name: 'OUTROS' }
  ];

  // Inicializa o inventário padrão para todos os produtos nas 3 lojas
  const defaultInventory: any[] = [];
  defaultProducts.forEach(p => {
    defaultStores.forEach(s => {
      defaultInventory.push({
        product_id: p.id,
        store_id: s.id,
        quantity: 15,
        min_stock: 2,
        sale_tolerance_days: 30
      });
    });
  });

  // API Mocked Object
  (window as any).api = {
    // --- PRODUTOS ---
    getProductByBarcode: async (barcode: string, storeId: string) => {
      const products = getStorage('products', defaultProducts);
      const inventory = getStorage('inventory', defaultInventory);
      const p = products.find(prod => prod.barcode === barcode.replace(/\D/g, '') && prod.archived === 0);
      if (!p) return null;
      
      const stocks: any = {};
      inventory.filter((i: any) => i.product_id === p.id).forEach((i: any) => {
        stocks[i.store_id] = i.quantity;
      });
      return { ...p, stocks, stock: stocks[storeId] || 0 };
    },

    getAllProducts: async () => {
      const products = getStorage('products', defaultProducts);
      const inventory = getStorage('inventory', defaultInventory);
      return products.map((p: any) => {
        const stocks: any = {};
        inventory.filter((i: any) => i.product_id === p.id).forEach((i: any) => {
          stocks[i.store_id] = i.quantity;
        });
        return { ...p, stocks };
      });
    },

    saveManualProduct: async (p: any) => {
      const products = getStorage('products', defaultProducts);
      const inventory = getStorage('inventory', defaultInventory);
      const stores = getStorage('stores', defaultStores);

      const id = p.id || 'p_' + Math.random().toString(36).substring(2, 9);
      const cleanBarcode = String(p.barcode || '').trim().replace(/\D/g, '');
      const cleanName = String(p.name || '').trim().toUpperCase();
      const cleanPrice = Number(p.price) || 0;

      const existingIndex = products.findIndex(item => item.id === p.id);
      if (existingIndex > -1) {
        products[existingIndex] = { 
          ...products[existingIndex], 
          name: cleanName, 
          barcode: cleanBarcode, 
          price: cleanPrice, 
          image: p.image || products[existingIndex].image 
        };
      } else {
        const newProduct = {
          id,
          barcode: cleanBarcode,
          name: cleanName,
          price: cleanPrice,
          cost_price: cleanPrice * 0.6,
          archived: 0,
          image: p.image || null,
          category_id: 'ESTOQUE'
        };
        products.push(newProduct);
        
        stores.forEach(s => {
          inventory.push({
            product_id: id,
            store_id: s.id,
            quantity: 0,
            min_stock: 2,
            sale_tolerance_days: 30
          });
        });
      }

      setStorage('products', products);
      setStorage('inventory', inventory);
      return true;
    },

    archiveProduct: async (data: { id: string, archived: boolean }) => {
      const products = getStorage('products', defaultProducts);
      const idx = products.findIndex(p => p.id === data.id);
      if (idx > -1) {
        products[idx].archived = data.archived ? 1 : 0;
        setStorage('products', products);
      }
      return true;
    },

    updateInventoryQuantity: async (data: { productId: string, storeId: string, quantity: number, minStock?: number, saleToleranceDays?: number }) => {
      const inventory = getStorage('inventory', defaultInventory);
      const idx = inventory.findIndex(i => i.product_id === data.productId && i.store_id === data.storeId);
      
      const qty = Number(data.quantity) || 0;
      const min = data.minStock !== undefined ? Number(data.minStock) : 2;
      const days = data.saleToleranceDays !== undefined ? Number(data.saleToleranceDays) : 30;

      if (idx > -1) {
        inventory[idx].quantity = qty;
        inventory[idx].min_stock = min;
        inventory[idx].sale_tolerance_days = days;
      } else {
        inventory.push({
          product_id: data.productId,
          store_id: data.storeId,
          quantity: qty,
          min_stock: min,
          sale_tolerance_days: days
        });
      }
      setStorage('inventory', inventory);
      return true;
    },

    importXmlProducts: async (xmlData: string, storeId: string) => {
      console.log('[BROWSER MOCK] Simulação de importação XML na loja', storeId);
      return { success: true };
    },

    uploadProductImage: async (data: { barcode: string, base64Data: string }) => {
      return { success: true, fileName: `${data.barcode}.png` };
    },

    // --- VENDAS ---
    saveSale: async (sale: any) => {
      const sales = getStorage('sales', []);
      const inventory = getStorage('inventory', defaultInventory);
      const transactions = getStorage('transactions', []);
      const commissions = getStorage('commissions', []);

      const saleId = 'venda_' + Math.random().toString(36).substring(2, 9);
      const newSale = {
        id: saleId,
        total: sale.total,
        discount: sale.discount || 0,
        payment_method: sale.payment_method,
        vendedor: sale.vendedor,
        store_id: sale.store_id,
        customer_id: sale.customer_id || null,
        items: JSON.stringify(sale.items),
        synced: 1,
        created_at: new Date().toISOString()
      };
      
      sales.push(newSale);
      setStorage('sales', sales);

      // Abate no estoque
      sale.items.forEach((item: any) => {
        const idx = inventory.findIndex(inv => inv.product_id === item.id && inv.store_id === sale.store_id);
        if (idx > -1) {
          inventory[idx].quantity = Math.max(0, inventory[idx].quantity - item.qtd);
        }
      });
      setStorage('inventory', inventory);

      // Finanças automática: entrada
      transactions.push({
        id: 'FT_' + Math.random().toString(36).substring(2, 9),
        type: 'INFLOW',
        category: 'VENDA',
        description: `VENDA PDV - ${sale.vendedor}`,
        amount: sale.total,
        date: new Date().toISOString(),
        payment_method: sale.payment_method,
        store_id: sale.store_id,
        reference_id: saleId,
        created_at: new Date().toISOString()
      });
      setStorage('transactions', transactions);

      // Comissão automática (2% padrão)
      commissions.push({
        id: 'COM_' + Math.random().toString(36).substring(2, 9),
        sale_id: saleId,
        vendedor: sale.vendedor,
        value: sale.total * 0.02,
        percentage: 2,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      setStorage('commissions', commissions);

      return { success: true, saleId };
    },

    getSalesByCustomer: async (customerId: string) => {
      const sales = getStorage('sales', []);
      return sales.filter(s => s.customer_id === customerId).sort((a, b) => b.created_at.localeCompare(a.created_at));
    },

    // --- LOJAS ---
    getStores: async (includeArchived?: boolean) => {
      const stores = getStorage('stores', defaultStores);
      return includeArchived ? stores : stores.filter(s => s.archived === 0);
    },

    saveStore: async (store: { id?: string, name: string }) => {
      const stores = getStorage('stores', defaultStores);
      const cleanName = store.name.trim().toUpperCase();
      if (store.id) {
        const idx = stores.findIndex(s => s.id === store.id);
        if (idx > -1) stores[idx].name = cleanName;
      } else {
        stores.push({
          id: 'loja_' + Math.random().toString(36).substring(2, 9),
          name: cleanName,
          archived: 0
        });
      }
      setStorage('stores', stores);
      return { success: true };
    },

    archiveStore: async (data: { id: string, archived: boolean }) => {
      const stores = getStorage('stores', defaultStores);
      const idx = stores.findIndex(s => s.id === data.id);
      if (idx > -1) {
        stores[idx].archived = data.archived ? 1 : 0;
        setStorage('stores', stores);
      }
      return { success: true };
    },

    // --- USUÁRIOS E LOGIN ---
    getUsers: async () => {
      return getStorage('users', defaultUsers);
    },

    saveUser: async (u: any) => {
      const users = getStorage('users', defaultUsers);
      const id = u.id || 'user_' + Math.random().toString(36).substring(2, 9);
      const idx = users.findIndex(user => user.id === u.id);
      if (idx > -1) {
        users[idx] = { ...users[idx], name: u.name, password: u.password, role: u.role };
      } else {
        users.push({ id, name: u.name, password: u.password, role: u.role || 'vendedor' });
      }
      setStorage('users', users);
      return { success: true };
    },

    login: async (credentials: any) => {
      const users = getStorage('users', defaultUsers);
      const u = users.find(user => user.name === credentials.username && user.password === credentials.password);
      return u ? { id: u.id, name: u.name, role: u.role } : null;
    },

    // --- CLIENTES (CRM) ---
    getCustomers: async () => {
      return getStorage('customers', []);
    },

    saveCustomer: async (c: any) => {
      const customers = getStorage('customers', []);
      const id = c.id || 'cust_' + Math.random().toString(36).substring(2, 9);
      const idx = customers.findIndex(cust => cust.id === c.id);
      
      const newCust = {
        id,
        name: String(c.name || '').trim().toUpperCase(),
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        cpf: c.cpf || '',
        rg: c.rg || '',
        birth_date: c.birth_date || '',
        city: String(c.city || 'ALMENARA').trim().toUpperCase(),
        origin: String(c.origin || '').trim().toUpperCase(),
        notes: c.notes || '',
        created_at: c.created_at || new Date().toISOString()
      };

      if (idx > -1) {
        customers[idx] = newCust;
      } else {
        customers.push(newCust);
      }
      setStorage('customers', customers);
      return { success: true, id };
    },

    // --- TAREFAS / PROCESSOS ---
    getTasks: async () => {
      return getStorage('tasks', []);
    },

    saveTask: async (t: any) => {
      const tasks = getStorage('tasks', []);
      const id = t.id || 'task_' + Math.random().toString(36).substring(2, 9);
      const idx = tasks.findIndex(task => task.id === t.id);

      const newTask = {
        id,
        title: String(t.title).toUpperCase(),
        assignee_type: t.assignee_type,
        assignee_id: t.assignee_id,
        status: t.status || 'pending',
        due_date: t.due_date || '',
        is_routine: t.is_routine ? 1 : 0,
        proof_required: t.proof_required ? 1 : 0,
        photo_proof: t.photo_proof || null,
        justification: t.justification || null,
        completed_at: t.completed_at || null,
        created_at: t.created_at || new Date().toISOString()
      };

      if (idx > -1) {
        tasks[idx] = newTask;
      } else {
        tasks.push(newTask);
      }
      setStorage('tasks', tasks);
      return { success: true, id };
    },

    deleteTask: async (id: string) => {
      const tasks = getStorage('tasks', []);
      const filtered = tasks.filter(t => t.id !== id);
      setStorage('tasks', filtered);
      return { success: true };
    },

    toggleTask: async (id: string, status: string) => {
      const tasks = getStorage('tasks', []);
      const idx = tasks.findIndex(t => t.id === id);
      if (idx > -1) {
        tasks[idx].status = status;
        tasks[idx].completed_at = status === 'completed' ? new Date().toISOString() : null;
        setStorage('tasks', tasks);
      }
      return { success: true };
    },

    completeTask: async (id: string, photo?: string, justification?: string) => {
      const tasks = getStorage('tasks', []);
      const idx = tasks.findIndex(t => t.id === id);
      if (idx > -1) {
        tasks[idx].status = 'completed';
        tasks[idx].photo_proof = photo || null;
        tasks[idx].justification = justification || null;
        tasks[idx].completed_at = new Date().toISOString();
        setStorage('tasks', tasks);
      }
      return { success: true };
    },

    // --- MANUTENÇÕES / ORDENS DE SERVIÇO ---
    getRepairs: async () => {
      return getStorage('repairs', []);
    },

    saveRepair: async (repair: any) => {
      const repairs = getStorage('repairs', []);
      const transactions = getStorage('transactions', []);
      const id = repair.id || 'os_' + Math.random().toString(36).substring(2, 9);
      const idx = repairs.findIndex(r => r.id === repair.id);

      const newRepair = {
        id,
        customer_name: repair.customer_name,
        customer_phone: repair.customer_phone,
        device_brand: repair.device_brand,
        device_model: repair.device_model,
        serial_number: repair.serial_number || '',
        issue_description: repair.issue_description,
        technical_notes: repair.technical_notes || '',
        checklist: repair.checklist || '',
        priority: repair.priority || 'normal',
        photo_url: repair.photo_url || null,
        price: Number(repair.price || 0),
        entry_store_id: repair.entry_store_id,
        maintenance_store_id: repair.maintenance_store_id,
        return_store_id: repair.return_store_id || repair.entry_store_id,
        current_store_id: repair.current_store_id || repair.entry_store_id,
        status: repair.status || 'Na Loja (Aguardando Envio)',
        payment_status: repair.payment_status || 'pending',
        delivery_date: repair.delivery_date || '',
        created_at: repair.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (idx > -1) {
        repairs[idx] = newRepair;
      } else {
        repairs.push(newRepair);
      }
      setStorage('repairs', repairs);

      // Transação se paga no ato
      if (repair.payment_status === 'paid' && repair.price > 0) {
        const transExists = transactions.some((t: any) => t.reference_id === id);
        if (!transExists) {
          transactions.push({
            id: 'FT_' + Math.random().toString(36).substring(2, 9),
            type: 'INFLOW',
            category: 'MANUTENÇÃO',
            description: `OS ${repair.device_model} - ${repair.customer_name}`,
            amount: repair.price,
            date: new Date().toISOString(),
            payment_method: 'DINHEIRO',
            store_id: repair.entry_store_id,
            reference_id: id,
            created_at: new Date().toISOString()
          });
          setStorage('transactions', transactions);
        }
      }

      return { success: true, id };
    },

    updateRepairStatus: async (data: { id: string, status: string, current_store_id: string }) => {
      const repairs = getStorage('repairs', []);
      const idx = repairs.findIndex(r => r.id === data.id);
      if (idx > -1) {
        repairs[idx].status = data.status;
        repairs[idx].current_store_id = data.current_store_id;
        repairs[idx].updated_at = new Date().toISOString();
        setStorage('repairs', repairs);
      }
      return { success: true };
    },

    updateRepairNotes: async (data: { id: string, technical_notes: string }) => {
      const repairs = getStorage('repairs', []);
      const idx = repairs.findIndex(r => r.id === data.id);
      if (idx > -1) {
        repairs[idx].technical_notes = data.technical_notes;
        repairs[idx].updated_at = new Date().toISOString();
        setStorage('repairs', repairs);
      }
      return { success: true };
    },

    updateRepairPayment: async (data: { id: string, payment_status: string }) => {
      const repairs = getStorage('repairs', []);
      const transactions = getStorage('transactions', []);
      const idx = repairs.findIndex(r => r.id === data.id);
      if (idx > -1) {
        repairs[idx].payment_status = data.payment_status;
        repairs[idx].updated_at = new Date().toISOString();
        setStorage('repairs', repairs);

        if (data.payment_status === 'paid' && repairs[idx].price > 0) {
          const transExists = transactions.some((t: any) => t.reference_id === data.id);
          if (!transExists) {
            transactions.push({
              id: 'FT_' + Math.random().toString(36).substring(2, 9),
              type: 'INFLOW',
              category: 'MANUTENÇÃO',
              description: `OS ${repairs[idx].device_model} - ${repairs[idx].customer_name}`,
              amount: repairs[idx].price,
              date: new Date().toISOString(),
              payment_method: 'DINHEIRO',
              store_id: repairs[idx].entry_store_id,
              reference_id: data.id,
              created_at: new Date().toISOString()
            });
            setStorage('transactions', transactions);
          }
        }
      }
      return { success: true };
    },

    uploadRepairImage: async (data: { id: string, base64Data: string }) => {
      return { success: true, fileName: `${data.id}.png` };
    },

    downloadProtocolTemplate: async () => {
      return 'Mocked template path';
    },

    // --- COMISSÕES ---
    getCommissions: async () => {
      return getStorage('commissions', []);
    },

    // --- DESPESAS E CAIXA ---
    getExpenses: async () => {
      const expenses = getStorage('expenses', []);
      const categories = getStorage('expense_categories', defaultCategories);
      return expenses.map((e: any) => {
        const cat = categories.find(c => c.id === e.category_id);
        return { ...e, category_name: cat ? cat.name : 'OUTROS' };
      }).sort((a, b) => b.date.localeCompare(a.date));
    },

    saveExpense: async (exp: any) => {
      const expenses = getStorage('expenses', []);
      const transactions = getStorage('transactions', []);
      const categories = getStorage('expense_categories', defaultCategories);

      const id = exp.id || 'exp_' + Math.random().toString(36).substring(2, 9);
      const newExp = {
        id,
        description: exp.description,
        category_id: exp.category_id,
        value: Number(exp.value) || 0,
        date: exp.date || new Date().toISOString(),
        payment_method: exp.payment_method,
        store_id: exp.store_id,
        synced: 1
      };
      
      expenses.push(newExp);
      setStorage('expenses', expenses);

      // Transação de saída
      const cat = categories.find(c => c.id === exp.category_id);
      transactions.push({
        id: 'FT_' + Math.random().toString(36).substring(2, 9),
        type: 'OUTFLOW',
        category: cat ? cat.name : 'OUTROS',
        description: exp.description,
        amount: Number(exp.value) || 0,
        date: exp.date || new Date().toISOString(),
        payment_method: exp.payment_method,
        store_id: exp.store_id,
        reference_id: id,
        created_at: new Date().toISOString()
      });
      setStorage('transactions', transactions);

      return { success: true };
    },

    deleteExpense: async (id: string) => {
      const expenses = getStorage('expenses', []);
      const transactions = getStorage('transactions', []);
      
      setStorage('expenses', expenses.filter(e => e.id !== id));
      setStorage('transactions', transactions.filter(t => t.reference_id !== id));
      return { success: true };
    },

    getExpenseCategories: async () => {
      return getStorage('expense_categories', defaultCategories);
    },

    saveExpenseCategory: async (cat: any) => {
      const categories = getStorage('expense_categories', defaultCategories);
      const id = cat.id || 'cat_' + Math.random().toString(36).substring(2, 9);
      const cleanName = cat.name.toUpperCase();
      categories.push({ id, name: cleanName });
      setStorage('expense_categories', categories);
      return { success: true };
    },

    // --- ORÇAMENTOS (BUDGETS) ---
    getBudgets: async () => {
      const budgets = getStorage('budgets', []);
      const categories = getStorage('expense_categories', defaultCategories);
      return budgets.map((b: any) => {
        const cat = categories.find(c => c.id === b.category_id);
        return { ...b, category_name: cat ? cat.name : 'OUTROS' };
      });
    },

    saveBudget: async (b: any) => {
      const budgets = getStorage('budgets', []);
      const id = b.id || 'bud_' + Math.random().toString(36).substring(2, 9);
      budgets.push({ id, category_id: b.category_id, amount: Number(b.amount) || 0, period: b.period });
      setStorage('budgets', budgets);
      return { success: true };
    },

    // --- PAINEL FINANCEIRO / DASHBOARD ---
    getFinancialSummary: async () => {
      const transactions = getStorage('transactions', []);
      const commissions = getStorage('commissions', []);
      const products = getStorage('products', defaultProducts);
      const sales = getStorage('sales', []);

      const totalInflow = transactions.filter(t => t.type === 'INFLOW').reduce((sum, t) => sum + t.amount, 0);
      const totalOutflow = transactions.filter(t => t.type === 'OUTFLOW').reduce((sum, t) => sum + t.amount, 0);
      
      const ledger = transactions.slice(-50).map(t => ({
        id: t.id,
        value: t.amount,
        date: t.date,
        description: t.description,
        payment_method: t.payment_method,
        type: t.type === 'INFLOW' ? `ENTRADA (${t.category})` : t.category
      })).reverse();

      // Custos estimados
      let totalCost = 0;
      sales.forEach(s => {
        try {
          const items = JSON.parse(s.items);
          items.forEach((item: any) => {
            const p = products.find(prod => prod.id === item.id);
            totalCost += (p ? p.cost_price : (item.preco * 0.6)) * item.qtd;
          });
        } catch {}
      });

      // Agrupamento mensal para tendências
      const monthlyGroups: any = {};
      transactions.forEach(t => {
        const dateObj = new Date(t.date);
        const monthYear = `${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`;
        if (t.type === 'INFLOW') {
          monthlyGroups[monthYear] = (monthlyGroups[monthYear] || 0) + t.amount;
        }
      });
      const trends = Object.keys(monthlyGroups).map(k => ({
        month: k,
        inflow: monthlyGroups[k]
      })).slice(-6);

      return {
        totalInflow,
        totalOutflow,
        netProfit: totalInflow - totalOutflow,
        estimatedCost: totalCost,
        trends,
        ledger
      };
    },

    getDashboardStats: async () => {
      const sales = getStorage('sales', []);
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
      const monthlyRevenue = sales.filter(s => {
        const d = new Date(s.created_at);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).reduce((sum, s) => sum + s.total, 0);

      return { totalRevenue, monthlyRevenue };
    },

    getLowStockItems: async () => {
      const inventory = getStorage('inventory', defaultInventory);
      const products = getStorage('products', defaultProducts);
      
      const invLow = inventory.filter(i => i.quantity <= i.min_stock).slice(0, 20);
      const ids = [...new Set(invLow.map(i => i.product_id))];
      
      return products.filter(p => ids.includes(p.id)).map(p => {
        const stocks: any = {};
        inventory.filter(i => i.product_id === p.id).forEach(i => stocks[i.store_id] = i.quantity);
        return { ...p, stocks };
      });
    },

    getStaleStockItems: async () => {
      const products = getStorage('products', defaultProducts);
      return products.slice(0, 10).map(p => ({ ...p, stocks: {} }));
    },

    // --- CONFIGURAÇÕES ---
    getSettings: async () => {
      return getStorage('settings', defaultSettings);
    },

    saveSettings: async (arr: { key: string, value: string }[]) => {
      const settings = getStorage('settings', defaultSettings);
      arr.forEach(s => {
        const idx = settings.findIndex(item => item.key === s.key);
        if (idx > -1) settings[idx].value = s.value;
        else settings.push(s);
      });
      setStorage('settings', settings);
      return { success: true };
    },

    isCloudConfigured: async () => {
      return false;
    },

    getAppTitle: async () => {
      const settings = getStorage('settings', defaultSettings);
      const title = settings.find(s => s.key === 'company_name');
      return title ? title.value : 'SDG CONTROLE';
    },

    // --- IMPRESSORAS E UTILS (STUBS) ---
    getPrinters: async () => {
      return [{ name: 'IMPRESSORA MOCK BROWSER', isDefault: true }];
    },

    testPrinter: async (data: { deviceName: string }) => {
      console.log('[BROWSER MOCK] Testando impressora:', data.deviceName);
      return { success: true };
    },

    printUSB: async (vid: number, pid: number, content: string) => {
      console.log('[BROWSER MOCK] Imprimindo via USB (VID:', vid, 'PID:', pid, '):', content);
      return { success: true };
    },

    printReceipt: async (data: any) => {
      console.log('[BROWSER MOCK] Imprimindo Cupom de Venda:', data);
      return { success: true };
    },

    printRepairReceipt: async (data: any) => {
      console.log('[BROWSER MOCK] Imprimindo Cupom de Ordem de Serviço:', data);
      return { success: true };
    },

    printRaw: async (data: any) => {
      console.log('[BROWSER MOCK] Imprimindo RAW:', data);
      return { success: true };
    },

    printSilent: async (html: string) => {
      console.log('[BROWSER MOCK] Imprimindo silencioso (HTML):', html.substring(0, 100) + '...');
      return { success: true };
    },

    usbDirectPrint: async (data: any) => {
      console.log('[BROWSER MOCK] Impressão USB direta buffer:', data.buffer);
      return { success: true };
    },

    listUsbDevices: async () => {
      return [{ vendorId: 10473, productId: 649, product: 'IMPRESSORA TERMICA MOCK' }];
    },

    getSyncStatus: async () => {
      return { pending: 0, total: getStorage('sales', []).length };
    },

    // --- WINDOW CONTROLS ---
    minimizeWindow: () => console.log('[BROWSER MOCK] Janela minimizada'),
    maximizeWindow: () => console.log('[BROWSER MOCK] Janela maximizada'),
    closeWindow: () => console.log('[BROWSER MOCK] Janela fechada'),
  };
}
