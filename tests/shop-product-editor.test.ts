import { expect, test } from 'vitest';
import { validateProductDetails } from '../lib/gemini/product-editor';
const valid = {title:'ChatGPT 1 tháng',durationMonths:1,price:229000,originalPrice:229000,category:'AI',description:'Tài khoản cấp sẵn',benefits:['Một tháng'],warrantyStatus:'unspecified',warranty:'',notes:'',thumbnail:'/gemini-products/chatgpt-1-thang-acc-cap-san.png',published:true,deliveryMode:'manual'};
test('validates complete product content without inventing warranty',()=>{expect(validateProductDetails(valid)).toMatchObject({price:229000,warrantyStatus:'unspecified'});});
test('rejects invalid prices, warranty promises, dangerous images and malformed fields',()=>{
 for(const fields of [{price:0},{originalPrice:1000},{price:1.5},{warrantyStatus:'included'},{thumbnail:'javascript:alert(1)'},{thumbnail:'http://example.com/a.png'},{benefits:['x'.repeat(501)]},{published:'true'},{title:''},{durationMonths:0},{thumbnail:''}]) expect(()=>validateProductDetails({...valid,...fields})).toThrow();
 expect(validateProductDetails({...valid,published:false,thumbnail:''})).toMatchObject({published:false});
});
