const chai = require('chai');
const chaiHttp = require('chai-http');
const { app, close } = require('../server');

chai.use(chaiHttp);
chai.should();

describe('Profiles API', () => {
  const demoUsername = 'demo';
  const exampleProfile = {
    name: 'AI',
    icon: 'fas fa-robot',
    displayName: 'AI',
    prompt: 'You are an AI assistant that helps people find information.'
  };

  describe('GET /profiles', () => {
    it('should return an array of profiles', async () => {
      const res = await chai.request(app).get('/profiles').query({ username: demoUsername });
      res.should.have.status(200);
      res.body.should.be.a('array');
    });
  });

  describe('POST /profiles', () => {
    it('should create a new profile and return it', async () => {
      const res = await chai
        .request(app)
        .post('/profiles')
        .query({ username: demoUsername })
        .send(exampleProfile);
      res.should.have.status(201);
      res.body.should.be.a('object');
      res.body.should.deep.equal(exampleProfile);
    });
  });

  describe('PUT /profiles/:name', () => {
    it('should update an existing profile and return it', async () => {
      const updatedProfile = { ...exampleProfile, icon: 'fas fa-new-icon' };
      const res = await chai
        .request(app)
        .put(`/profiles/${exampleProfile.name}`)
        .query({ username: demoUsername })
        .send(updatedProfile);
      res.should.have.status(200);
      res.body.should.be.a('object');
      res.body.should.deep.equal(updatedProfile);
    });
  });

  describe('DELETE /profiles/:name', () => {
    // 在删除之前，将配置文件恢复到原始状态
    before(async () => {
      await chai
        .request(app)
        .put(`/profiles/${exampleProfile.name}`)
        .query({ username: demoUsername })
        .send(exampleProfile);
    });

    it('should delete an existing profile and return it', async () => {
      const res = await chai
        .request(app)
        .delete(`/profiles/${exampleProfile.name}`)
        .query({ username: demoUsername });
      res.should.have.status(200);
      res.body.should.be.a('array');
      res.body[0].should.deep.equal(exampleProfile);
    });
  });
});

after(() => close());