// Script para configurar información de pago
// Edita este archivo con tus datos reales y luego ejecuta: node config-payment.js

const paymentConfig = {
  yape: {
    number: '999888777', // Cambia por tu número de Yape
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=yape://999888777'
  },
  plin: {
    number: '999888777', // Cambia por tu número de Plin
    qr: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=plin://999888777'
  },
  bankAccount: {
    bank: 'BCP', // Cambia por tu banco
    account: '191-12345678-0-00', // Cambia por tu número de cuenta
    cci: '002-191-001234567890-00' // Cambia por tu CCI
  }
};

console.log('📝 Configuración de pago:');
console.log(JSON.stringify(paymentConfig, null, 2));
console.log('\n💡 Edita frontend/src/components/PaymentModal.tsx con estos valores');

module.exports = paymentConfig;
