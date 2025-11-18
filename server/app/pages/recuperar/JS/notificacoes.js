// ================================================
// SISTEMA DE NOTIFICAÇÕES - EMAIL E SMS
// Com EmailJS e Twilio Verify API
// ================================================

// ===== CONFIGURAÇÕES =====

const CONFIG_NOTIFICACOES = {
    // EmailJS - Configure em: https://www.emailjs.com/
    email: {
        serviceId: 'service_abc123',
        templateId: 'template_e21odi8',
        publicKey: 'jNrL5NztwLog6VtWT'
    },
    
    // Twilio Verify - Já configurado! ✅
    sms: {
        accountSid: '',
        authToken: 'e177a3702507fd80f8b864ad81b84e51',
        verifyServiceSid: 'VA7e170b02d91eb84bfb9236a3e2a65589'
    }
};

// ===== INICIALIZAÇÃO EMAILJS =====

function inicializarEmailJS() {
    try {
        if (typeof emailjs !== 'undefined') {
            emailjs.init(CONFIG_NOTIFICACOES.email.publicKey);
            console.log('✅ EmailJS inicializado com sucesso!');
            return true;
        } else {
            console.warn('⚠️ EmailJS não carregado. Verifique se o script está incluído no HTML.');
            return false;
        }
    } catch (erro) {
        console.error('❌ Erro ao inicializar EmailJS:', erro);
        return false;
    }
}

// ===== FUNÇÃO: ENVIAR EMAIL =====

async function enviarEmailVerificacao(email, codigo) {
    console.log('📧 Tentando enviar email para:', email);
    
    // Verificar se EmailJS está configurado
    if (CONFIG_NOTIFICACOES.email.serviceId === 'seu_service_id') {
        console.error('❌ EmailJS não configurado!');
        throw new Error('Configure EmailJS para enviar emails. Acesse: https://www.emailjs.com/');
    }
    
    try {
        // Verificar se EmailJS está disponível
        if (typeof emailjs === 'undefined') {
            throw new Error('EmailJS não carregado');
        }
        
        // Parâmetros do template
        const templateParams = {
            to_email: email,
            verification_code: codigo,
            to_name: 'Usuário',
            company_name: 'Nova-X'
        };
        
        // Enviar email via EmailJS
        const response = await emailjs.send(
            CONFIG_NOTIFICACOES.email.serviceId,
            CONFIG_NOTIFICACOES.email.templateId,
            templateParams
        );
        
        console.log('✅ Email enviado com sucesso!', response);
        return {
            sucesso: true,
            mensagem: 'Email enviado com sucesso!',
            response: response
        };
        
    } catch (erro) {
        console.error('❌ Erro ao enviar email:', erro);
        return {
            sucesso: false,
            mensagem: `Erro ao enviar email: ${erro.text || erro.message}`
        };
    }
}

// ===== FUNÇÃO: ENVIAR SMS (TWILIO VERIFY) =====

async function enviarSMSVerificacao(telefone, codigo) {
    console.log('📱 Tentando enviar SMS para:', telefone);
    
    // Validar formato do telefone
    if (!telefone || !telefone.startsWith('+')) {
        console.error('❌ Formato de telefone inválido:', telefone);
        return {
            sucesso: false,
            mensagem: 'Formato de telefone inválido. Use o formato internacional: +5511940007291'
        };
    }
    
    try {
        // Preparar autenticação Basic Auth
        const auth = btoa(`${CONFIG_NOTIFICACOES.sms.accountSid}:${CONFIG_NOTIFICACOES.sms.authToken}`);
        
        // Fazer requisição para Twilio Verify API
        const response = await fetch(
            `https://verify.twilio.com/v2/Services/${CONFIG_NOTIFICACOES.sms.verifyServiceSid}/Verifications`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'To': telefone,
                    'Channel': 'sms',
                    'Locale': 'pt-BR'  // Mensagem em português
                })
            }
        );
        
        const data = await response.json();
        
        if (response.ok && data.status === 'pending') {
            console.log('✅ SMS enviado com sucesso via Twilio Verify!');
            return {
                sucesso: true,
                mensagem: 'SMS enviado com sucesso!',
                sid: data.sid,
                status: data.status
            };
        } else {
            // Tratar erros específicos
            let mensagemErro = 'Erro ao enviar SMS';
            
            if (data.code === 60200) {
                mensagemErro = 'Número não verificado. Adicione em Twilio Console → Verified Caller IDs';
            } else if (data.message) {
                mensagemErro = data.message;
            }
            
            console.error('❌ Erro Twilio:', data);
            return {
                sucesso: false,
                mensagem: mensagemErro,
                erro: data
            };
        }
        
    } catch (erro) {
        console.error('❌ Erro ao enviar SMS:', erro);
        return {
            sucesso: false,
            mensagem: `Erro de conexão: ${erro.message}`
        };
    }
}

// ===== FUNÇÃO: VERIFICAR CÓDIGO SMS (TWILIO VERIFY) =====

async function verificarCodigoSMS(telefone, codigo) {
    console.log('🔍 Verificando código para:', telefone);
    
    if (!codigo || codigo.length !== 6) {
        return {
            sucesso: false,
            mensagem: 'Código deve ter 6 dígitos'
        };
    }
    
    try {
        // Preparar autenticação Basic Auth
        const auth = btoa(`${CONFIG_NOTIFICACOES.sms.accountSid}:${CONFIG_NOTIFICACOES.sms.authToken}`);
        
        // Fazer requisição para Twilio Verify API
        const response = await fetch(
            `https://verify.twilio.com/v2/Services/${CONFIG_NOTIFICACOES.sms.verifyServiceSid}/VerificationCheck`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    'To': telefone,
                    'Code': codigo
                })
            }
        );
        
        const data = await response.json();
        
        if (response.ok && data.status === 'approved') {
            console.log('✅ Código verificado com sucesso!');
            return {
                sucesso: true,
                mensagem: 'Código verificado com sucesso!',
                status: data.status
            };
        } else if (data.status === 'pending') {
            console.log('❌ Código incorreto');
            return {
                sucesso: false,
                mensagem: 'Código incorreto'
            };
        } else if (data.status === 'canceled' || data.status === 'expired') {
            console.log('⏰ Código expirado');
            return {
                sucesso: false,
                mensagem: 'Código expirado. Solicite um novo código.'
            };
        } else {
            console.error('❌ Erro ao verificar:', data);
            return {
                sucesso: false,
                mensagem: 'Erro ao verificar código',
                erro: data
            };
        }
        
    } catch (erro) {
        console.error('❌ Erro na verificação:', erro);
        return {
            sucesso: false,
            mensagem: `Erro de conexão: ${erro.message}`
        };
    }
}

// ===== FUNÇÃO: VERIFICAR STATUS DAS NOTIFICAÇÕES =====

function verificarStatusNotificacoes() {
    const emailConfigurado = CONFIG_NOTIFICACOES.email.serviceId !== 'seu_service_id';
    const smsConfigurado = CONFIG_NOTIFICACOES.sms.accountSid && 
                          CONFIG_NOTIFICACOES.sms.authToken && 
                          CONFIG_NOTIFICACOES.sms.verifyServiceSid;
    
    return {
        email: emailConfigurado ? '✅ Configurado' : '❌ Não configurado',
        sms: smsConfigurado ? '✅ Configurado' : '❌ Não configurado',
        emailJsCarregado: typeof emailjs !== 'undefined' ? '✅ Carregado' : '❌ Não carregado'
    };
}

// ===== INICIALIZAÇÃO AUTOMÁTICA =====

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Sistema de Notificações carregado!');
    console.log('═══════════════════════════════════════');
    
    // Inicializar EmailJS se disponível
    if (typeof emailjs !== 'undefined') {
        const emailConfigurado = CONFIG_NOTIFICACOES.email.serviceId !== 'seu_service_id';
        if (emailConfigurado) {
            inicializarEmailJS();
            console.log('✅ Email (EmailJS) - Configurado');
        } else {
            console.log('⚠️ Email (EmailJS) - Não configurado');
        }
    } else {
        console.log('⚠️ EmailJS não carregado no HTML');
    }
    
    // Verificar SMS
    console.log('✅ SMS (Twilio Verify) - Configurado');
    console.log('📱 Telefone verificado: +5511940007291');
    console.log('═══════════════════════════════════════');
});

// ===== LOGS DE DEBUG =====

console.log('📦 notificacoes.js carregado!');
console.log('🔧 Configurações Twilio Verify:');
console.log('   Account SID:', CONFIG_NOTIFICACOES.sms.accountSid);
console.log('   Verify Service SID:', CONFIG_NOTIFICACOES.sms.verifyServiceSid);
console.log('   Auth Token:', CONFIG_NOTIFICACOES.sms.authToken.substring(0, 4) + '...');