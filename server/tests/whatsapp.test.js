import nock from 'nock';
import { toWhatsAppNumber, sendTemplate } from '../src/services/whatsapp.service.js';
import { orderStatusParams, ownerNewOrderParams } from '../src/services/whatsapp.messages.js';

beforeAll(() => {
  nock.disableNetConnect();
});
afterAll(() => {
  nock.enableNetConnect();
});
afterEach(() => nock.cleanAll());

describe('phone numbers', () => {
  it('turns Nigerian local and international forms into WhatsApp digits', () => {
    expect(toWhatsAppNumber('08012345678')).toBe('2348012345678');
    expect(toWhatsAppNumber('+234 801-234-5678')).toBe('2348012345678');
    expect(toWhatsAppNumber('2348012345678')).toBe('2348012345678');
  });

  it('rejects numbers that cannot be right', () => {
    expect(toWhatsAppNumber('123')).toBeNull();
    expect(toWhatsAppNumber('')).toBeNull();
    expect(toWhatsAppNumber(undefined)).toBeNull();
  });
});

describe('sending templates', () => {
  it('posts an approved template to the Cloud API with the body parameters', async () => {
    let sent;
    nock('https://graph.facebook.com')
      .post('/v21.0/100200300400500/messages', (body) => {
        sent = body;
        return true;
      })
      .matchHeader('authorization', 'Bearer test-wa-token')
      .reply(200, { messages: [{ id: 'wamid.1' }] });

    const res = await sendTemplate({
      to: '08012345678',
      template: 'order_received',
      params: ['Ada', 'NVT-2611-00001', '₦1,000'],
    });
    expect(res).toEqual({ sent: true });
    expect(sent.to).toBe('2348012345678');
    expect(sent.type).toBe('template');
    expect(sent.template.name).toBe('order_received');
    expect(sent.template.components[0].parameters.map((p) => p.text)).toEqual([
      'Ada',
      'NVT-2611-00001',
      '₦1,000',
    ]);
  });

  it('turns a rejected message into a clear error, not a silent failure', async () => {
    nock('https://graph.facebook.com')
      .post(/messages$/)
      .reply(400, { error: { message: 'Template not approved' } });
    await expect(
      sendTemplate({ to: '08012345678', template: 'order_received', params: ['x'] })
    ).rejects.toThrow(/Template not approved/);
  });

  it('sends nothing when the number is missing', async () => {
    expect(await sendTemplate({ to: '', template: 'order_received', params: [] })).toEqual({
      sent: false,
    });
  });
});

describe('message content', () => {
  const order = {
    orderNumber: 'NVT-2611-00042',
    customer: { name: 'Ada Okafor', phone: '08012345678' },
    total: 1500000,
    items: [{ qty: 2 }],
    delivery: { method: 'pickup' },
  };

  it('gives the owner the order number, buyer, total and stock status', () => {
    const p = ownerNewOrderParams(order, []);
    expect(p[0]).toBe('NVT-2611-00042');
    expect(p[1]).toBe('Ada Okafor');
    expect(p[3]).toMatch(/15,000/);
    expect(p[6]).toBe('Stock OK');
    expect(ownerNewOrderParams(order, ['Galaxy (needed 2)'])[6]).toMatch(/Stock check needed/);
  });

  it('says the right thing for shipped orders, with tracking when there is one', () => {
    const shipped = orderStatusParams(order, 'shipped', { courier: 'GIG', trackingNumber: 'G123' });
    expect(shipped[2]).toBe('on its way');
    expect(shipped[3]).toMatch(/GIG.*G123/);
  });
});
