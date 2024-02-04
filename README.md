# weak-reversi
弱いリバーシ

## オリジナル  
[【JavaScript】 最弱リバーシを作る[1]:DOM要素と描画](https://note.affi-sapo-sv.com/js-reversi-s1.php)  
デモ  
https://ss-ikechang.github.io/weak-reversi/1-DOM-elements-and-drawing/

[【JavaScript】 最弱リバーシを作る[2]:ゲーム状況の管理](https://note.affi-sapo-sv.com/js-reversi-s2.php)  

[【JavaScript】 最弱リバーシを作る[3]:思考ルーチンを組み込む](https://note.affi-sapo-sv.com/js-reversi-s3.php)  
デモ  
https://ss-ikechang.github.io/weak-reversi/original/


## コードリーディングで得られた知見  
どうしても下記のコードの意味が分からない。DOMの構造がよくわかってないからなのか、forEachが読めないからか。
```
Object.entries( styles ).forEach( e => entity.style[e[0]] = e[1] );
return entity
```
JavaScript で forEach を使うのは最終手段 #JavaScript - Qiita  
https://qiita.com/diescake/items/70d9b0cbd4e3d5cc6fce