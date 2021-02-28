(function($) {
    function BAR() {
        let bar = [
            '<div id="grid-orar" style="float:left">',
                '<table border="1" cellspacing="2" cellpadding="1"></table>',
            '</div>',
            '<div id="tools-bar" style="float:left;padding-left:2em;margin-top:20px">',
                '<p style="padding-right:1em"><button title="reÎNCARCĂ orarul iniţial">Load</button><button id="applyHIST">applyHIST</button></p>',
                '<p><input value="9A"><button title="COMUTĂ orar/orar_clasă">Mark</button></p>',
                '<p><button title="COMUTĂ orar/orar_ferestre">Gaps</button>&thinsp;<span></span>&thinsp;|<span></span></p>',
                '<p><button title="INTERSCHIMBĂ orele marcate, pe coloanele respective">SWAP</button></p>',
                '<p><button title="ANULEAZĂ operaţii SWAP, începând cu ultima">Undo</button></p>',
                '<p><a title="SALVEAZĂ orarul curent (CSV) şi istoricul SWAP">Export</a></p>',
            '</div>'
        ];
        return $(bar.join(''));
    };
    
    function gaps(ore) {  // listă ca ['P40','-','9A','-','11D','-','8F','-']
        let sore = ore.slice(1).join('');  // şirul '-9A-11D-8F-'
        return sore.replace(/^-*/, '').replace(/-*$/, '')  // '9A-11D-8F'
                   .split('-')   // tabloul ['9A', '11D', '8F'] 
                   .length - 1;  // numărul de ferestre
    };
    
    function SWAP(td1, td2) {
        let x1 = td1.text(), 
            x2 = td2.text();
        td1.text(x2);
        td2.text(x1);
    };
   
    $.widget("vb.dayRecast", {
        _create: function() { 
            BAR().insertAfter(this.element);
            $('#tools-bar').find('p:gt(0)').hide();
            this.orar = [];
            this.spread = {};
            this._set_handlers();
        },
        
        _set_orar: function() {
            if(! this.element.val()) return;
            let txt = this.element.val().trim();  //lines = this.element.val().trim().split(/\n/);
            let spl = txt.split("History:");
            let lines = spl[0].trim().split(/\n/),
            HIST = [];
            if(spl.length == 2) HIST = spl[1].trim().split(/\n/);
            let orar = [];
            $.each(lines, function(i, el) {
                orar.push(el.split(','));
            });
            if(collision()) return;      
            this.spread = set_spread(); 
            this.HIST = HIST;
            return orar; // $('#grid-orar').next().html(JSON.stringify(orar, null, 2));
         
            function collision() {
                let err = []
                for(let j=1, m=orar[0].length; j < m; ++j)
                    for(let i=0, n=orar.length-1; i < n; ++i) 
                        for(let k=i+1, p=n+1; k < p; ++k) {
                            let ora = orar[i][j];
                            if(ora.length > 1 && ora == orar[k][j])
                                err.push(orar[i][0] + ' / ' + orar[k][0] + ': ' + ora + 
                                         ', ora ' + j);
                        }
                if(err.length > 0) {
                    alert("Suprapuneri:\n\n" + err.join('\n'));
                    return true;
                }
            };
            
            function set_spread() {  // clasă => [idx_prof. cu ore la acea clasă]
                let spread = {};
                let m = orar[0].length;
                for(let i=0, n=orar.length; i < n; i++)
                    for(var j=1; j < m; j++) {
                        var q = orar[i][j];
                        if(q == '-') continue;
                        if(! spread[q])
                            spread[q] = [i];
                        else {
                            if(spread[q].indexOf(i) == -1)
                                spread[q].push(i);
                        }
                    }
                return spread;
            };
        },

        _init: function() {
            if(this.orar.length == 0) return;
            let scor = 0;
            let html = []; 
            $.each(this.orar, function(i, el) {
                scor += gaps(el);
                html.push('<tr><td>', el[0], '</td>');
                for(let i=1, n=el.length; i < n; ++i) {
                    if(el[i] != '-')
                        html.push('<td>', el[i], '</td>');
                    else
                        html.push('<td>', el[i], '</td>');
                }
                html.push('</tr>');
            });
            this.hist = [];
            this.element.prev().hide();
            this.element.hide();
            $('#grid-orar table').html($(html.join('')));
            $('#tools-bar').find('span:first').text(scor)
                                              .next().text('');  // initial gaps
            if(this.HIST.length > 0)
                $('button#applyHIST').show();
            else 
                $('button#applyHIST').off();
        },
        
        _set_handlers: function() {
            var bar = $('#tools-bar'),
                got = $('#grid-orar table');
            var Self = this;

            bar.find('button:first').on('click', function(event) {
                if(Self.element.is(':visible')) {
                    Self.orar = Self._set_orar();
                    $('#tools-bar').find('p:gt(0)').show();
                }
                Self._init();                
            });
            
            $("button#applyHIST").on('click', function(event) {  //console.log(Self.HIST);
                let horar = [],  // NU = Self.orar (modificarea s-ar face pe Self.orar)
                    hst = Self.HIST;
                for(let i=0, n=Self.orar.length; i < n; i++) {
                    horar[i] = [];
                    for(let j=0, m = Self.orar[i].length; j < m; j++) 
                        horar[i][j] = Self.orar[i][j];
                } 
                for(let r12 of hst) {
                    let swp = r12.split(','),
                        row = parseInt(swp[0]),  // index prof. la care SWAP
                        t1 = parseInt(swp[1]),   // index '-' destinaţie
                        t2 = parseInt(swp[2]);   // index clasă de mutat
                    let sig = '-'; 
                    let cls = horar[row][t1];
                    horar[row][t1] = sig;
                    horar[row][t2] = cls;
                    do {
                        for(let i=0, hn=horar.length; i < hn; i++)
                            if(i != row && horar[i][t2] == cls) {
                                row = i;
                                break;
                            }
                        cls = horar[row][t1];
                        horar[row][t1] = horar[row][t2];
                        horar[row][t2] = cls;
                    } while(cls != sig);
                }
                // console.log(horar, Self.orar);
                let html = [], scor=0;
                $.each(horar, function(i, el) {
                    scor += gaps(el);
                    html.push('<tr><td>', el[0], '</td>');
                    for(let i=1, n=el.length; i < n; ++i) {
                        if(el[i] != '-')
                            html.push('<td>', el[i], '</td>');
                        else
                            html.push('<td>', el[i], '</td>');
                    }
                    html.push('</tr>');
                });
                bar.find('span:last').text(scor);  // alert(scor);
                $('#grid-orar table').html($(html.join('')));
            });
            
            bar.find('button:contains(Mark)').on('click', function(event) {
                let clasa = $(this).prev().val(); 
                if(clasa == '') {
                    got.find('td').removeClass('highlight');
                    got.find('tr').show();
                } else {
                    got.find('tr').toggle();
                    got.find('td:contains(' + clasa + ')')
                       .toggleClass('highlight').parent().show();
                    $(this).prev().val("");
                };
            });
            
            bar.find('button:contains(Gaps)').on('click', function(event) {
                let rows = got.find('tr');
                if(got.hasClass('theGaps')) {
                    rows.show();
                    got.removeClass('theGaps');
                } else {
                    let profs = get_gapLines();
                    rows.hide();
                    $.each(profs, function(i, el) {
                        rows.eq(el).show();
                    });
                    got.addClass('theGaps');
                };                
            });

            function get_scor() {
                let grid = got[0], scor = 0;
                for(let i=0, rl=grid.rows.length; i < rl; i++) {
                    let line = [];
                    for(let j=0, cl=grid.rows[0].cells.length; j < cl; j++)
                        line.push(grid.rows[i].cells[j].innerHTML);
                    scor += gaps(line);
                }
                return scor;
            };
            
            function get_gapLines() {
                let grid = got[0], gapL = [];
                for(let i=0, rl=grid.rows.length; i < rl; i++) {
                    let line = [];
                    for(let j=0, cl=grid.rows[0].cells.length; j < cl; j++)
                        line.push(grid.rows[i].cells[j].innerHTML);
                    if(gaps(line) > 0) gapL.push(i);
                }
                return gapL;
            };

            got.on('click', function(event) {
                let target = $(event.target);
                if(target.is('td')) {
                    if(target.index() > 0) {
                        let ql = target.text();
                        if(ql == '-')
                            target.addClass('gap-source');
                        else
                            target.addClass('gap-dest');
                    }
                    else {
                        let rows = got.find('tr');
                        if(got.hasClass('spread')) {
                            rows.show();
                            got.removeClass('spread');
                        }
                        else {
                            let idx = target.parent().index(),
                                ore = Self.orar[idx],
                                profs = [];
                            for(let i=1, n=ore.length; i < n; i++) {
                                let q = ore[i];
                                if(q == '-') continue;
                                let sprq = Self.spread[q];
                                for(let j=0, m=sprq.length; j < m; j++)
                                    if(profs.indexOf(sprq[j]) == -1)
                                        profs.push(sprq[j]);
                            }
                            rows.hide();
                            $.each(profs, function(i, el) {
                                rows.eq(el).show();
                            });
                            got.addClass('spread');
                        }
                    }
                }
            });
            
            bar.find('button:contains(SWAP)').on('click', function(event) {
                let td1 = got.find('td.gap-source');
                if(td1.length == 1) {
                    let td2 = td1.parent().find('td.gap-dest');
                    if(td2.length == 1) {
                        let id1 = td1.index(), 
                            id2 = td2.index();
                            Self.hist.push([td1.parent().index(), id2, id1].join(', '));
                            let sig = '-';
                            SWAP(td1, td2);
                            do { 
                                 td2 = td1.parent().siblings()
                                                   .find("td:contains("+td1.text()+")")
                                                   .filter(function() {
                                                        return $(this).index() == id1;});
                                 td1 = td2.parent().find("td")
                                                   .filter(function() {
                                                        return $(this).index() == id2;})
                                 if(!(td1.length && td2.length)) {
                                    alert('Lipseşte o clasă, pe coloană!\n(a folosi "undo")');
                                    break;
                                 }
                                 SWAP(td1, td2);
                                 td1 = td2;
                             } while(td1.text() != sig);
                         
                         bar.find('span:last').text(get_scor());  // current gaps
                    }
                }
                got.find('td').removeClass('gap-source').removeClass('gap-dest');
                got.find('td.highlight').removeClass('highlight');
            });
            
            bar.find('button:contains(Undo)').on('click', function(event) {
                if(Self.hist.length > 0) {
                    var last = Self.hist.pop().split(',');
                    var tr = got.find('tr').eq(last[0])
                                .find('td').eq(last[1]).addClass('gap-source')
                                .end()
                                .eq(last[2]).addClass('gap-dest');
                    bar.find('button:contains(SWAP)').click();
                    Self.hist.pop();
                }
            });

            bar.find('a').on('click', function(event){
                let grid = got[0];
                let gridS = '';
                let cols = grid.rows[0].cells.length - 1;
                for(let i=0, rl=grid.rows.length; i < rl; i++) {
                    for(let j=0; j < cols; j++)
                        gridS += grid.rows[i].cells[j].innerHTML + ",";
                    gridS += grid.rows[i].cells[cols].innerHTML + "\r\n";
                }
                gridS += "\r\n\r\nHistory:\r\n";
                gridS += Self.hist.join('\r\n') + "\r\n";
                let finm = 'Recast' + bar.find('span:last').text() + '.csv';
                $(event.target).prop({
                    'href': 'data:application/csv;charset=utf-8,' + encodeURIComponent(gridS),
                    'target': '_blank',
                    'download': finm
                });
            });
            
        }
    });
})(jQuery);

// hist = [ "49, 1, 6", "52, 3, 5", "42, 5, 6", "21, 4, 6", "36, 4, 6", "70, 3, 6", "70, 1, 3" ]
// de la 60 gaps iniţial, la 50 gaps

/* până la gaps=40:
hist=["49, 1, 6",
  "52, 3, 5",
  "42, 5, 6",
  "21, 4, 6",
  "36, 4, 6",
  "70, 3, 6",
  "70, 1, 3",
  "13, 4, 2",
  "14, 4, 1",
  "15, 5, 2",
  "20, 4, 5",
  "22, 2, 5",
  "21, 3, 4",
  "20, 2, 4",
  "20, 4, 1",
  "13, 2, 1",
  "29, 5, 6",
  "29, 3, 5",
  "14, 1, 6",
  "40, 3, 5",
  "40, 5, 1",
  "23, 3, 6",
  "13, 4, 6",
  "6, 5, 6",
  "26, 3, 5",
  "37, 4, 7",
  "41, 3, 6",
  "41, 4, 5",
  "70, 2, 5",
  "67, 5, 1",
  "13, 4, 1",
  "13, 6, 3",
  "15, 2, 4",
  "15, 3, 6",
  "20, 3, 1",
  "20, 4, 2",
  "4, 5, 6",
  "6, 4, 6",
  "10, 3, 6",
  "12, 3, 4",
  "19, 3, 5",
  "22, 3, 5",
  "24, 3, 1",
  "27, 4, 3",
  "28, 3, 6",
  "5, 3, 1",
  "9, 3, 5",
  "15, 3, 5",
  "2, 3, 5",
  "15, 3, 1",
  "15, 4, 5",
  "21, 3, 4",
  "12, 3, 1",
  "23, 3, 6",
  "10, 3, 1"]
*/


