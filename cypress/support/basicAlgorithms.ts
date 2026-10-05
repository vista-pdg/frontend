/// <reference types="cypress" />
import { SEEDED } from './commands';
import { openSidebar } from './navigation';
import { goToLastStep, nodeBoxes } from './hu19';
import type { Node3D, Edge3D, StepsResponse } from '../../src/types/graph';

const node=(id:string,value:number,x=0,parent:string|null=null,properties:Record<string,unknown>={}):Node3D=>({id,label:String(value),x,y:0,z:0,depth:parent?1:0,parent,properties});
const link=(from:string,to:string):Edge3D=>({id:`${from}:${to}`,from,to,weight:null,directed:true});
const tree={nodes:[node('r',10),node('l',5,-3,'r'),node('q',15,3,'r')],edges:[link('r','l'),link('r','q')]};
const heap={nodes:[node('r',10,0,null,{index:0}),node('l',5,-3,'r',{index:1}),node('q',8,3,'r',{index:2})],edges:tree.edges};
const list={nodes:[node('a',3,0,null,{index:0}),node('b',-1,3,null,{index:1}),node('c',3,6,null,{index:2})],edges:[link('a','b'),link('b','c')]};
const hash={nodes:[{...node('b0',0),label:'[0]',properties:{bucket:true}},{...node('b1',1,3),label:'[1]',properties:{bucket:true}},node('a',3,3,'b1',{hashBucket:1}),node('b',5,3,'a',{hashBucket:1})],edges:[link('b1','a'),link('a','b')]};
const sequence=(type:'stack'|'queue')=>({nodes:[node('a',3,0,null,{index:0,role:type==='stack'?'bottom':'front'}),node('b',8,3,null,{index:1,role:type==='stack'?'top':'rear'})],edges:type==='stack'?[]:[link('a','b')]});
interface Scenario {type:string;subtype:string;op:string;nav:string;scene?:{nodes:Node3D[];edges:Edge3D[]};values?:string;argument?:number;check:(r:NonNullable<StepsResponse['steps']>[number])=>void}
const scenarios:Scenario[]=[];
const labels=(s:NonNullable<StepsResponse['steps']>[number])=>s.nodes.map(n=>Number(n.label));
for(const subtype of ['bst','avl']) {
  for(const op of ['preorder','postorder','levelorder']) scenarios.push({type:'tree',subtype,op,nav:`nav-tree-${subtype}`,scene:tree,check:s=>{
    expect(s.variables?.salida).to.eq(op==='postorder'?'[5, 15, 10]':'[10, 5, 15]');
    expect(s.nodes.map(n=>n.id)).to.have.members(['r','l','q']);
  }});
  scenarios.push({type:'tree',subtype,op:'search',nav:`nav-tree-${subtype}`,scene:tree,argument:5,check:s=>expect(s.title).to.eq('Clave encontrada')});
}
scenarios.push({type:'tree',subtype:'bst',op:'insert',nav:'nav-tree-bst',values:'10, 5, 15, 5',check:s=>expect(labels(s)).to.have.members([10,5,15])});
for(const op of ['levelorder','search']) scenarios.push({type:'tree',subtype:'btree',op,nav:'nav-tree-btree',scene:tree,argument:op==='search'?15:undefined,check:s=>{
  if(op==='levelorder') expect(s.variables?.salida).to.eq('[10, 5, 15]');else expect(s.title).to.eq('Clave encontrada');
}});
for(const op of ['heapify','insert','extract','peek']) scenarios.push({type:'tree',subtype:'heap',op,nav:'nav-heap',scene:op==='heapify'?undefined:heap,values:op==='heapify'?'3, 1, 8, 5, 2':undefined,argument:op==='insert'?12:undefined,check:s=>{
  const byId=new Map(s.nodes.map(n=>[n.id,Number(n.label)]));
  for(const n of s.nodes) if(n.parent) expect(byId.get(n.parent)!).to.be.at.least(Number(n.label));
  expect(s.variables?.máximo).to.eq(op==='insert'?'12':op==='peek'?'10':'8');
  if(op==='extract') expect(s.variables?.extraído).to.eq('10');
}});
for(const type of ['stack','queue'] as const) {
  scenarios.push({type,subtype:'simple',op:type==='stack'?'push':'enqueue',nav:`nav-${type}`,values:'3, 8, 1',check:s=>{
    expect(labels(s)).to.deep.eq([3,8,1]);expect(s.nodes.at(type==='stack'?-1:0)?.properties?.role).to.eq(type==='stack'?'top':'front');
  }});
  scenarios.push({type,subtype:'simple',op:'peek',nav:`nav-${type}`,scene:sequence(type),check:s=>expect(s.variables?.resultado).to.eq(type==='stack'?'8':'3')});
}
for(const op of ['traverse','search','append','delete','reverse']) scenarios.push({type:'linked-list',subtype:'simple',op,nav:'nav-linked-list',scene:list,argument:op==='append'?7:op==='search'||op==='delete'?3:undefined,check:s=>{
  if(op==='traverse') expect(s.variables?.salida).to.eq('[3, -1, 3]');
  if(op==='append') expect(labels(s)).to.deep.eq([3,-1,3,7]);
  if(op==='delete') expect(s.nodes.map(n=>n.id)).to.deep.eq(['b','c']);
  if(op==='reverse') expect(s.nodes.map(n=>n.id)).to.deep.eq(['c','b','a']);
  if(op==='search') expect(s.variables?.encontrado).to.eq('true');
}});
for(const op of ['search','insert','delete']) scenarios.push({type:'hash-table',subtype:'chaining',op,nav:'nav-hash-table',scene:hash,argument:op==='insert'?-7:3,check:s=>{
  if(op==='search') expect(s.variables?.encontrado).to.eq('true');
  if(op==='insert') expect(s.nodes.find(n=>n.label==='-7')?.properties?.hashBucket).to.eq(1);
  if(op==='delete') {expect(s.nodes.map(n=>n.id)).not.to.include('a');expect(s.edges.some(e=>e.from==='b1'&&e.to==='b')).to.eq(true);}
}});
for(const op of ['bubble-sort','selection-sort','insertion-sort','merge-sort','quick-sort','heap-sort']) scenarios.push({type:'linked-list',subtype:'simple',op,nav:'nav-linked-list',values:'3, -1, 3, 0, -5',check:s=>{
  expect(labels(s)).to.deep.eq([-5,-1,0,3,3]);expect(new Set(s.nodes.map(n=>n.id)).size).to.eq(5);
  expect(s.variables).to.have.property('comparaciones');
}});

// No API responses are mocked: all new entries execute against the isolated e2e backend.
export function verifyBasicAlgorithms(criterion: 'trees' | 'heap-linear' | 'list-hash' | 'sorting') {
  const selected = scenarios.filter(s => criterion === 'trees' ? s.type === 'tree' && s.subtype !== 'heap' : criterion === 'heap-linear' ? s.subtype === 'heap' || s.type === 'stack' || s.type === 'queue' : criterion === 'sorting' ? s.op.endsWith('-sort') : s.type === 'hash-table' || s.type === 'linked-list' && !s.op.endsWith('-sort'));
  describe(`Basic algorithms · ${criterion} · real API and player`,()=>{
  beforeEach(()=>{
    cy.clearLocalStorage();cy.loginByApi(SEEDED.student.email,SEEDED.student.password);
    cy.visit('/',{onBeforeLoad:w=>w.localStorage.setItem('vista_visualization_mode','2D')});
    openSidebar();
  });
  for(const s of selected) it(`${s.type}/${s.subtype}/${s.op}: correct result and persistent trace in 2D/3D`,()=>{
    cy.get(`[data-cy=${s.nav}]`).click();
    if(s.scene) cy.window().then(w=>w.__vista!.engine.loadStructure(s.scene!.nodes,s.scene!.edges,null));
    cy.get('[data-cy=algorithm-toggle]').click();
    cy.get(`[data-cy=algo-item-${s.type}-${s.subtype}-${s.op}]`).scrollIntoView().click();
    if(s.values) cy.get('[data-cy=algo-values]').clear().type(s.values);
    if(s.argument!==undefined) cy.get('[data-cy=algo-argument]').clear().type(String(s.argument));
    cy.intercept('POST','/api/algorithm/steps').as('steps');
    cy.get('[data-cy=algo-generate]').scrollIntoView().click();
    cy.wait('@steps').then(({request,response})=>{
      expect(response?.statusCode).to.eq(200);const body=response!.body as StepsResponse;
      expect(body.error).to.eq(false);expect(body.steps!.length).to.be.greaterThan(1);
      s.check(body.steps!.at(-1)!);
      if(s.argument!==undefined) expect(request.body.argument).to.eq(s.argument);
      if(s.scene) expect(request.body.nodes.map((n:Node3D)=>n.id)).to.deep.eq(s.scene.nodes.map(n=>n.id));
      for(const step of body.steps!) expect(step.line).to.be.within(1,body.code!.length);
    });
    cy.get('[data-cy=algorithm-panel] button[aria-label="Cerrar panel"]').click();
    goToLastStep();
    if(s.op.endsWith('-sort')) cy.get('[data-cy=canvas-2d]').should(svg=>{
      const boxes=nodeBoxes(svg);expect(new Set(boxes.map(n=>n.y)).size).to.eq(1);
      expect(boxes.slice().sort((a,b)=>a.x-b.x).map(n=>Number(n.label))).to.deep.eq([-5,-1,0,3,3]);
    });
    cy.window().then(w=>{
      const before=w.__vista!.engine.getState();const trace=JSON.stringify(before.trace),index=before.stepIndex;
      cy.get('[data-cy=mode-3d]').click();cy.get('[data-cy=canvas-3d]').should('exist');
      cy.get('[data-cy=mode-2d]').click();cy.get('[data-cy=canvas-2d]').should('exist');
      cy.window().should(win=>{expect(JSON.stringify(win.__vista!.engine.getState().trace)).to.eq(trace);expect(win.__vista!.engine.getState().stepIndex).to.eq(index);});
    });
  });
});

}
