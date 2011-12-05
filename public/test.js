$(document).ready(function(){
    describe("PlayliveApplication", function() {
        var p = window.playlive;
        var ev;
        beforeEach(function() {
            ev = {
                preventDefault: function() {
                    this.eventStopped = true;
                }
            };
        });

        describe('view', function() {
            it('default view is the main view', function() {
                expect(p.view).toBe(p.views.main);
            });


        });

        describe('upload', function () {
            it('File size is limited', function () {
                ev.dataTransfer = {
                    files: [{
                        size: 40*1000*1000
                    }]
                };
                expect(p.onDrop(ev)).toBe(false);
                expect(p.status.text()).toEqual('File Too Large!');
            });

            it('File upload works', function () {
                console.log('Test incomplete');
                return;

                ev.dataTransfer = {
                    files: [{
                        size: 2*1000*1000
                    }]
                };
                p.onDrop(ev);
                expect(p.status.text()).toEqual('File Too Large!');
            });
        });
    });
});
