// Synthesized ambience: no downloaded recordings and no autoplay before consent.
export class Ambience {
  constructor(){this.context=null;this.enabled=false;this.timer=null;}
  async toggle(){
    if(!this.context){
      const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)throw new Error('Web Audio is not available.');
      this.context=new AudioContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination);
      const buffer=this.context.createBuffer(1,this.context.sampleRate*4,this.context.sampleRate),data=buffer.getChannelData(0);let brown=0;
      for(let i=0;i<data.length;i++){brown=(brown+(Math.random()*2-1)*.018)/1.02;data[i]=brown*3;}
      const noise=this.context.createBufferSource();noise.buffer=buffer;noise.loop=true;
      const filter=this.context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;
      const gain=this.context.createGain();gain.gain.value=.18;noise.connect(filter);filter.connect(gain);gain.connect(this.master);noise.start();
    }
    await this.context.resume();this.enabled=!this.enabled;this.master.gain.setTargetAtTime(this.enabled?.35:0,this.context.currentTime,.25);
    if(this.enabled)this.schedule();else{clearTimeout(this.timer);this.timer=null;}return this.enabled;
  }
  schedule(){if(!this.enabled)return;this.timer=setTimeout(()=>{this.chirp();this.schedule();},1600+Math.random()*3800);}
  chirp(){const c=this.context,t=c.currentTime;for(let i=0;i<3;i++){const osc=c.createOscillator(),amp=c.createGain(),start=t+i*.15;osc.type='sine';osc.frequency.setValueAtTime(2200+Math.random()*800,start);osc.frequency.exponentialRampToValueAtTime(3800+Math.random()*700,start+.07);osc.frequency.exponentialRampToValueAtTime(1900,start+.12);amp.gain.setValueAtTime(0,start);amp.gain.linearRampToValueAtTime(.025,start+.025);amp.gain.exponentialRampToValueAtTime(.0001,start+.14);osc.connect(amp);amp.connect(this.master);osc.start(start);osc.stop(start+.16);osc.onended=()=>{osc.disconnect();amp.disconnect();};}}
  chime(){if(!this.enabled)return;const c=this.context;[523.25,659.25,783.99].forEach((frequency,i)=>{const osc=c.createOscillator(),gain=c.createGain(),t=c.currentTime+i*.1;osc.frequency.value=frequency;gain.gain.setValueAtTime(.09,t);gain.gain.exponentialRampToValueAtTime(.0001,t+.9);osc.connect(gain);gain.connect(this.master);osc.start(t);osc.stop(t+1);osc.onended=()=>{osc.disconnect();gain.disconnect();};});}
}
