    "use strict";

(()=>{
    const option = {
        GAMEWIDTH : 300, // 画面の最大幅
        MESSAGE_HEIGHT : 50, // メッセージパネルの高さ
        CONTROL_HEIGHT : 50, // コントロールパネルの高さ
        BORD_FILL_COLOR: "#339933", // 盤面の色
        BORD_LINE_COLOR: "#000000", // 盤面の枠色
        BORD_LINE_WIDTH: 1,  // 盤面の境界線の太さ
        BORD_OUTERLINE_WIDTH: 4, // 盤面の外枠の太さ
        BORD_PIECE_NUM: 8,  // 横方向のコマ数
        PIECE_WIDTH_PER: 80, // 一枠の幅とコマの幅の割合
        PIECE_BLACK_COLOR: "#000000", // 黒コマの色
        PIECE_WHITE_COLOR: "#FFFFFF", // 白コマの色
    };
    Object.freeze( option );
    const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

    /**
    * DOM内にリバーシ用の要素を作成
    * @param id
    */
    const makeGameBord = id => {
    
        const setStyles = ( entity , styles ) => {
            Object.entries( styles ).forEach( e => entity.style[e[0]] = e[1] );
            return entity
        };
        const createDiv = ()=>
            setStyles( document.createElement("div") , {
                margin: 0,padding: 0,boxSizing: "border-box"} );
        
            // メッセージパネルとコントロールパネルの内側要素作成
        const [messageEntity,ctrlEntity] =
            [ [createDiv(),"パス"],[createDiv(),"開始"] ]
                .map( ([div,btnName]) => {
                    const result = {
                        inner: div ,p : document.createElement("p") ,
                        btn : setStyles( document.createElement("button") ,
                                {width:"50px",height:"50px",display:"none"})
                    };
                    result.btn.textContent = btnName;
                    setStyles( div , {display:"flex",justifyContent:"space-between"} );
                    div.appendChild( createDiv() ).appendChild(result.p);
                    div.appendChild(
                            setStyles(createDiv(),{width:"50px",height:"50px"} )
                        ).appendChild(result.btn);
                    return result;
                });
        
        const pDiv = document.getElementById(id);
        
        const gameWidth // 盤の幅を計算
            = Math.min( pDiv.clientWidth,option.GAMEWIDTH ) + option.MESSAGE_HEIGHT + option.CONTROL_HEIGHT < window.innerHeight
            ? Math.min( pDiv.clientWidth,option.GAMEWIDTH )
            : window.innerHeight - option.MESSAGE_HEIGHT - option.CONTROL_HEIGHT;
        
        const widthPixsel = gameWidth + "px";
        
        const screenObj = { };
        // ボードパネル、メッセージパネル、コントロールパネル要素作成
        [screenObj.message,screenObj.bord,screenObj.control] = (
            ( divStyles ) =>[
                [option.MESSAGE_HEIGHT,
                    div=>(div.appendChild(messageEntity.inner)  && messageEntity)],
                [gameWidth,div=>{ // キャンバスの設置
                    const cvs = setStyles( document.createElement("canvas" ) ,
                        { width : widthPixsel , height : widthPixsel ,
                        top :0 , left : 0,border:"0", position:"absolute",cursor:"pointer",
                        boxSizing : "border-box",padding:"0",margin:"0",zIndex:0} );
        
                    cvs.width = cvs.height =  option.GAMEWIDTH;
                    div.appendChild(cvs);
        
                    return  {canvas : cvs};
                }],
                [option.CONTROL_HEIGHT,
                    div=>(div.appendChild(ctrlEntity.inner)  && ctrlEntity)]
            ].map(
                ( [height ,  innerFunc ] )=>{
                    const addDiv = setStyles( document.createElement("div") , divStyles );
        
                    addDiv.style.height = height + "px";
                    const result = innerFunc(addDiv);
                    result.panel = pDiv.appendChild( addDiv );
                    return Object.freeze(result);
                }
            )
        )({position:"relative", padding:"0" , boxSizing : "border-box",
            border:"0",maxWidth:"100%",margin:"0 auto",width: widthPixsel });
        
        return Object.freeze( screenObj );
    };

    // ゲーム定数

    const PLAYER_NONE = Symbol();
    const PLAYER_YOU = Symbol();
    const PLAYER_COMP = Symbol();

    const getPlayText = ( player , txt) =>
        player === PLAYER_YOU ? txt[0] : txt[1];

    /**
     * メッセージパネルコントローラー
     * @param message
     */
    const getMessageControler = message =>{

        const { p , btn } = message;

        const msg = [["あなた（黒）の番です","考えています…"],["あなたがとれるコマがありません","こちらがとれるコマがありません"]];

        return Object.freeze({
            message : text => p.textContent = text,
            turnMessage : function( player ){ this.message(getPlayText( player , msg[0] )) },
            clear:function(){this.message("")},
            pass: function(player,callBack){
                this.message(getPlayText( player , msg[1] ));
                btn.style.display = "block";
                const cb = ()=>{btn.removeEventListener("click",cb);btn.style.display = "none";callBack();}
                btn.addEventListener("click",cb);
            }
        });
    };
    /**
     * コントロールパネルコントローラー
     * @param control
     * @param clickCallback
     */
    const getControlControler = ( control , clickCallback ) =>{
        const { p , btn } = control;
        btn.addEventListener("click",()=>clickCallback());
        btn.style.display="block";
    
        return Object.freeze({
               // ゲームの状況を表示 r[0] 残りコマ数 r[1] 対戦者のコマ数 r[2] コンピューターのコマ数
            result : r => p.textContent = `●${r[1]} ○${r[2]}`,
            clear:function(){ this.result(""); },
        });
    };
    /**
     * レイヤー描画操作ヘルパーオブジェクト
     * @param canvas キャンバス
     * @param clickCallback キャンバスクリック時に呼び出される関数
     */
    const getMakeDrawingControler = ( canvas , clickCallback ) => {

        const context = canvas.getContext( "2d" ); // コンテキスト取得
    
    
        const {GAMEWIDTH:bordSize , BORD_OUTERLINE_WIDTH:edgeSize} = option;
            // ブラウザ上の幅とキャンバス幅の比率
        const scale = canvas.width / canvas.clientWidth;
            // 外枠を除いた盤面幅
        const innerSize = bordSize - edgeSize * 2;
            // コマ枠の幅
        const pieceWidth = Math.floor( innerSize / option.BORD_PIECE_NUM );
            // 白黒コマの幅
        const pieceRadius = Math.floor(pieceWidth / 100 * option.PIECE_WIDTH_PER / 2);
            // コマ枠の中心点座標
        const pieceCenterPoint = edgeSize + Math.floor( pieceWidth / 2 );
        const pieceCenter = ( col , row ) => [ pieceWidth * col + pieceCenterPoint , pieceWidth * row + pieceCenterPoint];
    
            // クリック位置の取得
        const getClickPiece = e => {
                const rect = e.target.getBoundingClientRect();
                // ブラウザ座標→キャンバス上でのクリック座標計算
                let [x,y] = [ (e.clientX - rect.left)*scale ,(e.clientY - rect.top)*scale];
                if( x <= edgeSize || y <= edgeSize || x >= innerSize || y >= innerSize ) return null;
                x -= edgeSize; y -= edgeSize;// 外枠分差し引く
                return [Math.floor(x / pieceWidth) , Math.floor(y / pieceWidth )];
            };
    
            // キャンバスクリックイベントの登録
        canvas.addEventListener( "click" , (e)=>{
                const pNumber = getClickPiece(e);
                if( pNumber !== null ) clickCallback( pNumber );
            });
    
        const obj = {
            initBord : function (){
                this.clear();
    
                context.save();
    
                [context.fillStyle , context.strokeStyle , context.lineWidth ]
                    = [option.BORD_LINE_COLOR , option.BORD_LINE_COLOR , option.BORD_LINE_WIDTH];
                context.fillRect(0 , 0 , bordSize , bordSize);
                context.fillStyle = option.BORD_FILL_COLOR;
                context.fillRect( edgeSize , edgeSize , innerSize , innerSize);
    
                context.beginPath();
    
                for( let col = 1,posXY = edgeSize ; col < option.BORD_PIECE_NUM ; col ++ ){
                    posXY += pieceWidth;
                    context.moveTo(posXY,0);context.lineTo(posXY,bordSize);
                    context.moveTo(0,posXY);context.lineTo(bordSize,posXY);
                }
                context.stroke();context.restore();
            },
            clear:( ) => {
                context.clearRect( 0 , 0 , bordSize , bordSize);
                return this;
            },
            drawPiece :  ( col , row , player ) => {
    
                const center = pieceCenter(col , row);
                context.save();
                context.fillStyle = context.strokeStyle
                    = getPlayText(player,[option.PIECE_BLACK_COLOR,option.PIECE_WHITE_COLOR]);
                context.beginPath();
    
                context.arc( ...center , pieceRadius , 0, 2 * Math.PI ,false);
                context.fill();
    
                context.restore();
            },
        };
    
        obj.initBord();
        return Object.freeze(obj);
    };

    /**
     * 盤面データの管理
     * @param drawCtrl
     */
    const getGameDataManager = ( drawCtrl )=>{
    
        const pieceNum = option.BORD_PIECE_NUM;
    
    
            // ゲーム状況データ作成 横、縦の2次元配列
        const data = Array.from({length:8},
            e => new Array(pieceNum).fill(PLAYER_NONE) );
    
            // 指定位置(col , row)から指定方向(stepX , stepY)でコマがとれるかチェック
        const checkPiece = ( col , row ,stepX , stepY , nowPlayer ) =>{
            let x = col + stepX,y = row + stepY;
            let firstPos = null;
            let count = 0;
    
            while( true ){
                if( x < 0 || x >= pieceNum || y < 0 || y >= pieceNum ) return false;
                const stat = status(x,y);
                if( stat === PLAYER_NONE ) return false;
    
                if( stat === nowPlayer )
                    return firstPos === null ? false
                        : [firstPos,[x-=stepX,y-=stepY],[stepX,stepY],count]; // 始点、終点、方向
    
                if( firstPos === null ) firstPos = [x,y];
                count++;
    
                x += stepX;y += stepY;
    
            }
        };
    
            // 指定位置の状況を取得
        const status = ( col , row ) =>  data[row][col];
        const statusSet = ( col , row ,val ) =>  data[row][col] = val;
    
            // 指定位置にコマを置けるかどうかチェック
        const pointCheck = ( col , row , player , checkOnly = true) => {
    
            const piece = status( col , row );
            if( piece !== PLAYER_NONE ) return false;
            const nextPlayer = player === PLAYER_YOU ? PLAYER_COMP : PLAYER_YOU;
            const result = [];
    
            return ( [[-1,-1],[0 , -1],[1 , -1],[1 , 0],[1 , 1],[0 , 1],[-1 , 1],[-1 , 0]]
                    .some( e => {
                        const range = checkPiece( col , row , e[0] , e[1] , player , nextPlayer );
                        if( range !== false ){
                            if( checkOnly ) return true;
                            result.push(range);
                        }
                    })
            ) ? true : ( result.length === 0 ? false : result );
    
        };
    
    
    
        return Object.freeze({
                // ゲーム状況データのリセット
            reset:()=>{data.forEach(e=>e.fill(PLAYER_NONE));drawCtrl.initBord()},
                // コマの配置と描画
            pieceSet:function( col , row , val ){
                statusSet(col,row, val);
                if( drawCtrl !== null ) drawCtrl.drawPiece( col , row , val );
                return this;
            },
                // コマを置ける位置を検索
            getFreePlaces: ( player ) => {
                const result=[];
                for( let row = 0 ; row < pieceNum ; row ++ ){
                    for( let col = 0 ; col < pieceNum ; col ++ ){
                        if( pointCheck( col , row , player ) !== false ) result.push( [col,row] );
                    }
                }
                return result.length === 0 ? false : result;
            },
                // 現在の状況
            result: ()=>{
                let c1 = 0,c2 = 0,c3 = 0;
                for( let row = 0 ; row < pieceNum ; row ++ ){
                    for( let col = 0 ; col < pieceNum ; col ++ ){
                        switch( status( col , row ) ){
                            case PLAYER_NONE:c1++;break;
                            case PLAYER_YOU:c2++;break;
                            case PLAYER_COMP:c3++;break;
                        }
                    }
                }
                return [c1,c2,c3];
            },
                // 指定した位置にコマを置き、裏返し可能なものを処理
            clickSets: async function( col , row , player,callBack){
    
                const range = pointCheck( col , row , player , false );
                this.pieceSet( col , row , player);
                if( range === false ) return;
                for( let i = 0 ; i < range.length ; i ++ ){
                    let [colp , rowp] = range[i][0];
                    const [stX , stY] = range[i][2];
                    const [endColp , endRowp] =
                        [range[i][1][0] + stX , range[i][1][1] + stY];
    
                    while( colp !== endColp || rowp !== endRowp ){
                        await wait(500);
                        this.pieceSet( colp , rowp , player);
                        callBack(this.result());
                        colp += stX;rowp += stY;
                    }
                }
                return this.result();
            },
                // 最弱思考ルーチン
            compThink:()=>{
                const free=[];
                let res;
    
                for( let row = 0 ; row < pieceNum ; row ++ ){
                    for( let col = 0 ; col < pieceNum ; col ++ ){
                        if( (res = pointCheck( col , row , PLAYER_COMP , false )) !== false ) {
                            const sum = res.reduce( (a,b)=>[ 0 , 0 , 0 , a[3] +b[3] ],[0,0,0,0])[3];
                            free.push( [ col , row , res , sum ] );
                        }
                    }
                }
                if( free.length === 0 ) return false;
                free.sort( (a,b)=>b[3]-a[3] );
                for( let i = 0; i < free.length ; i ++ ){
                    const [x,y] = free[i];
                    if( (x === 0 && y === 0) ||  (x === 7 && y === 0)
                        ||  (x === 0 && y === 7) ||  (x === 7 && y === 7) ) return [x,y];
                }
                return [ free[0][0] , free[0][1] ];
            }
        });
    };
    
    window.addEventListener( "DOMContentLoaded" , ()=> {
        let player = PLAYER_YOU;
        let passWait = false,running = false,clickSetsWait = false,thinkWait = false;
        let freeSpace = null;
    
        const playerChange = () =>{
            player = (player === PLAYER_YOU ? PLAYER_COMP : PLAYER_YOU);
            messageCtrl.turnMessage( player );
            freeSpace = gameData.getFreePlaces( player );
            if( freeSpace === false ){  // 取れるコマがない
                passWait = true;
                messageCtrl.pass( player , ()=>{
                    passWait = false;
                    playerChange();
                    // freeSpace===nullの場合、どちらもとれず終了
                });
            }else if( player === PLAYER_COMP ) think();
        };
    
        const putPiece = pos => {
            clickSetsWait=true;
            gameData.clickSets( pos[0] ,pos[1] , player ,
                     result => controlCtrl.result(result)
                ).then( result => {
                            controlCtrl.result(result);
                            clickSetsWait=false;
                            playerChange();
                        }
                );
    
        };
    
        const gameScreen =  makeGameBord( "reversi" );
        const messageCtrl =  getMessageControler( gameScreen.message );
        messageCtrl.message("開始ボタンを押してください");
    
        const controlCtrl =  getControlControler( gameScreen.control,
            ()=>{
                if( passWait || clickSetsWait ) return;
                if( running && !confirm("最初から始めますか？")) return;
                gameData.reset();
                gameData.pieceSet( 3 , 3 , PLAYER_COMP ).pieceSet( 4 , 4 , PLAYER_COMP )
                    .pieceSet( 4 , 3 , PLAYER_YOU ).pieceSet( 3 , 4 , PLAYER_YOU );
                controlCtrl.result(gameData.result());
                running=true;
                player = PLAYER_YOU;
                messageCtrl.turnMessage(player);
                freeSpace = gameData.getFreePlaces(player);
            });
    
        const think = async () =>{
    
            const pos = gameData.compThink();
            await wait( 1000 );
            putPiece(pos);
    
        };
    
        const gameData = getGameDataManager(
            getMakeDrawingControler( gameScreen.bord.canvas,
                ( pos )=>{
                    if( passWait || !running || player === PLAYER_COMP || clickSetsWait) return;
    
                    const [col,row] = pos;
                    if( freeSpace.some( e => e[0] === col && e[1] === row ) ) putPiece(pos);
    
                }
            )
        );
    
    });
})();
