(function($) {
    function gaps(ore) {  // listă ca ['P01','-','9A','-','11D','-','8F','-']
        let sore = ore.slice(1).join('');  // şirul '-9A-11D-8F-'
        return sore.replace(/^-*/, '').replace(/-*$/, '')  // '9A-11D-8F'
                   .split('-')   // tabloul ['9A', '11D', '8F'] 
                   .length - 1;  // numărul de ferestre
    };
    
    function SWAP(td1, td2) {  // schimbă conţinuturile între două celule
        let x1 = td1.text(), 
            x2 = td2.text();
        td1.text(x2);
        td2.text(x1);
    };

    function set_orar(CSV) {  // prof,ora1,...,ora6 [,ora7]   ('-' = liber)
        let lines = CSV.trim().split(/\n/),
            orar = [];
        $.each(lines, function(i, el) {
                      orar.push(el.split(','));
        });
        if(collision()) return;  // pentru cazul când orarul a fost modificat manual
        return orar;
        
        function collision() {  // verifică dacă există suprapuneri de ore
            let err = [];
            for(let j=1, m=orar[0].length; j < m; ++j)
                for(let i=0, n=orar.length-1; i < n; ++i) 
                    for(let k=i+1, p=n+1; k < p; ++k) {
                        let ora = orar[i][j];
                        if(ora.length > 1 && ora == orar[k][j])
                            err.push(orar[i][0]+' / '+orar[k][0]+': '+ora+', ora '+j);
                    }
            if(err.length > 0) {
                alert("Suprapuneri:\n\n" + err.join('\n'));
                return true;
            }
        };
    };

    function set_spread(orar) {
        let spread = {};  // { clasă => [idx_prof. cu ore la acea clasă], }
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

    function set_html(orar) {
        let scor = 0, 
            html = ['<table border="1" cellspacing="2" cellpadding="1">']; 
        $.each(orar, function(i, el) {
            scor += gaps(el);   // numărul de ferestre existente în orar
            html.push('<tr><td>', el[0], '</td>');  // numele profesorului ("P01")
            for(let i=1, n=el.length; i < n; ++i)
                html.push('<td>', el[i], '</td>');  // orarul pentru "P01"
            html.push('</tr>');
        });
        html.push("</table>", scor);  // scor = html.pop()
        return html;
    };

    function intersect(orar1, orar2) {  
        let id12 = [];  // indecşii în cele două orare ale câte unui aceluiaşi profesor
        for(let i=0, n1=orar1.length; i < n1; i++)
            for(let j=0, n2=orar2.length; j < n2; j++) 
                if(orar1[i][0] == orar2[j][0]) {
                    id12.push([i, j]);
                    break;
                }
        return id12;
    };
       
    $.widget("vb.pairRecast", {  // jQuery widget (jquery.ui.widget.js)

        _create: function() { 
            let twos = this.element.children(),
                sch1 = twos.eq(0),  // DIV cu orarul primului schimb (în TEXTAREA)
                sch2 = twos.eq(1);  // DIV orar schimbul 2
            let csv1 = sch1.find('textarea').val(),
                csv2 = sch2.find('textarea').val();
            if(!(csv1 && csv2)) {
                alert("În 'pairRecast.html' lipseşte orarul unuia dintre schimburi");
                return;
            }
            this.orar1 = set_orar(csv1);
            this.orar2 = set_orar(csv2);
            this.spread1 = set_spread(this.orar1);
            this.spread2 = set_spread(this.orar2);
            let html1 = set_html(this.orar1),
                html2 = set_html(this.orar2),
                scor1 = html1.pop(),
                scor2 = html2.pop();
            this.Sch1 = sch1.empty().append($(html1.join(""))); 
            this.Sch2 = sch2.empty().append($(html2.join("")));
            this.BAR = this.element.next();  // bara cu butoanele acţiunilor
            let scor = this.BAR.find('span');
            this.Scor1 = scor.eq(0).text(scor1);  // afişează "scor" pe schimburi
            this.Scor2 = scor.eq(2).text(scor2);
            this.Hist = [[], [], 0];  // păstrează mutările SWAP, pe schimburi
            this._set_handlers();  // ataşează handlere de 'click', pe butoane
        },
        
        _set_handlers: function() {
            let bar = this.BAR,
                got1 = this.Sch1.find('table'),
                got2 = this.Sch2.find('table'), 
                got12 = got1.add(got2),
                Self = this; 
            // (de)marchează liniile care conţin o aceeaşi clasă
            bar.find('button:contains(Mark)').on('click', function(event) {
                let clasa = $(this).prev().val();            
                if(clasa == '') {
                    got12.find('td').removeClass('highlight')
                                    .end().find('tr').show();
                } else { 
                    let got = Self.spread1[clasa] ? got1 : (Self.spread2[clasa]? got2 : null);
                    if(got) {
                        got.find('tr').toggle();
                        got.find('td:contains(' + clasa + ')')
                            .toggleClass('highlight').parent().show();
                        $(this).prev().val("");
                    } else {alert(clasa + " nu există în orar");}
                }    
            });
            // (de)marchează liniile care conţin ferestre
            bar.find('button:contains(Gaps)').on('click', function(event) {
                let clasa = bar.find('input').val();
                if(clasa == '') {
                    let rows1 = got1.find('tr'),
                        rows2 = got2.find('tr');
                    if(got1.hasClass('theGaps')) {
                        rows1.show();
                        got1.removeClass('theGaps');
                    } else {
                        let profs1 = get_gapLines(1);
                        rows1.hide();
                        $.each(profs1, function(i, el) {
                            rows1.eq(el).show();
                        });
                        got1.addClass('theGaps');
                    };
                    if(got2.hasClass('theGaps')) {
                        rows2.show();
                        got2.removeClass('theGaps');
                    } else {
                        let profs2 = get_gapLines(2);
                        rows2.hide();
                        $.each(profs2, function(i, el) {
                            rows2.eq(el).show();
                        });
                        got2.addClass('theGaps');
                    };
                } else {
                    if(Self.spread1[clasa] || Self.spread2[clasa]) {
                        let got = Self.spread1[clasa] ? got1 : got2,
                            sc = Self.spread1[clasa] ? 1 : 2;
                        let rows = got.find('tr');
                        if(got.hasClass('theGaps')) {
                            rows.show();
                            got.removeClass('theGaps');
                        } else {
                            let profs = get_gapLines(sc);
                            rows.hide();
                            $.each(profs, function(i, el) {
                                rows.eq(el).show();
                            });
                            got.addClass('theGaps');
                        };                
                    };
                };
            });
            function get_gapLines(sch) {
                let grid = sch == 1 ? got1[0] : got2[0], 
                    gapL = [];
                for(let i=0, rl=grid.rows.length; i < rl; i++) {
                    let line = [];
                    for(let j=0, cl=grid.rows[0].cells.length; j < cl; j++)
                        line.push(grid.rows[i].cells[j].innerHTML);
                    if(gaps(line) > 0) gapL.push(i);
                }
                return gapL;
            };
            // (de)marchează liniile profesorilor cu ore în ambele schimburi
            bar.find('button:contains(Intersect)').on('click', function(event) {
                if(got1.hasClass('theSame')) {
                    got1.removeClass('theSame').find('tr').show();
                    got2.find('tr').show();
                } else {
                    let same = intersect(Self.orar1, Self.orar2),
                        tr1 = got1.find('tr').hide(),
                        tr2 = got2.find('tr').hide();
                    $.each(same, function(i, el) {
                        tr1.eq(el[0]).show();
                        tr2.eq(el[1]).show();
                    });
                    got1.addClass('theSame');
                }
            });
            // marchează o clasă şi un '-' (pe o aceeaşi linie), pentru SWAP
            got12.on('click', function(event) {
                if(got12.find('td.gap-dest').length > 0)
                    got12.find('td').removeClass('gap-source').removeClass('gap-dest');
                let target = $(event.target);
                if(target.is('td') && target.index() > 0) {
                    let ql = target.text();
                    if(ql == '-')
                        target.addClass('gap-dest');
                    else
                        target.addClass('gap-source');
                }
            });
            // interschimbă pe cele două coloane, orele marcate (evitând suprapunerile)
            bar.find('button:contains(SWAP)').on('click', function(event) {
                let td1 = got12.find('td.gap-source');
                if(td1.length == 1) {
                    let td2 = td1.parent().find('td.gap-dest');
                    if(td2.length == 1) {
                        let clasa = td1.text(),
                            hst = Self.spread1[clasa] ? 0 : 1;
                        let id1 = td1.index(), 
                            id2 = td2.index();
                            Self.Hist[hst].push([td1.parent().index(), id1, id2].join(', '));
                            let sig = '-';
                            SWAP(td1, td2);
                            do { 
                                 td1 = td2.parent().siblings()
                                                   .find("td:contains("+td2.text()+")")
                                                   .filter(function() {
                                                        return $(this).index() == id2;});
                                 td2 = td1.parent().find("td")
                                                   .filter(function() {
                                                        return $(this).index() == id1;})
                                 if(!(td1.length && td2.length)) {
                                    alert('Lipseşte o clasă, pe coloană!\n(a folosi imediat "Undo")\n');
                                    break;
                                 }
                                 SWAP(td1, td2);
                                 td2 = td1;
                             } while(td2.text() != sig);
                        if(hst == 0)
                            Self.Scor1.next().text(get_scor(0));
                        else
                            Self.Scor2.next().text(get_scor(1));
                        Self.Hist[2] = hst;  // memorează schimbul pe care s-a operat SWAP
                    }
                }
                got12.find('td').removeClass('gap-source')
                                .removeClass('gap-dest')
                                .removeClass('highlight');
            });
            function get_scor(sch) {  // numărul actual de ferestre, din tabelul HTML al schimbului
                let grid = got12[sch], 
                    scor = 0;
                for(let i=0, rl=grid.rows.length; i < rl; i++) {
                    let line = [];
                    for(let j=0, cl=grid.rows[0].cells.length; j < cl; j++)
                        line.push(grid.rows[i].cells[j].innerHTML);
                    scor += gaps(line);
                }
                return scor;
            };
            // reconstituie starea dinaintea ultimei operaţii SWAP
            bar.find('button:contains(Undo)').on('click', function(event) {
                let hst = Self.Hist[2],
                    Shst = Self.Hist[hst],
                    got = $(got12[hst]);
                if(Shst.length > 0) {
                    let last = Shst.pop().split(',');
                    let tr = got.find('tr').eq(last[0])
                                .find('td').eq(last[2]).addClass('gap-source')
                                .end()
                                .eq(last[1]).addClass('gap-dest');
                    bar.find('button:contains(SWAP)').click();
                    Shst.pop();
                }
            });
            // salvează orarele într-un fişier CSV (fără antet)
            bar.find('a').on('click', function(event) {
                let gridS = '';
                for(got of [got1, got2]) { 
                    let grid = got[0];
                    let cols = grid.rows[0].cells.length - 1;
                    for(let i=0, rl=grid.rows.length; i < rl; i++) {
                        for(let j=0; j < cols; j++)
                            gridS += grid.rows[i].cells[j].innerHTML + ",";
                        gridS += grid.rows[i].cells[cols].innerHTML + "\r\n";
                    }
                    gridS += '\r\n\r\n';
                }
                let finm = 'pairRecast_' + Self.Scor1.text() + '-' + Self.Scor2.text() + '.csv';
                $(event.target).prop({
                    'href': 'data:application/csv;charset=utf-8,' + 
                            encodeURIComponent(gridS),
                    'target': '_blank',
                    'download': finm
                });
            });
        }
    });
})(jQuery);


