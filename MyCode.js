import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import MediaHandler from '../MediaHandler';
import Pusher from 'pusher-js';
import Peer from 'simple-peer';

const APP_KEY = '';

export default class App extends Component {

    constructor(){
        super();

        this.state = {
            hasMedia : false,
            otherUserId : null,
        };

        this.user = window.user;
        this.user.stream = null;
        this.peers = {};


        this.mediaHandler = new MediaHandler();
        this.setUpPusher();

        this.callTo = this.callTo.bind(this);
        this.setUpPusher = this.setUpPusher.bind(this);
        this.startPeer = this.startPeer.bind(this);

    }


    componentWillMount(){
        this.mediaHandler.getPermissions()
        .then((stream) => {
            this.setState({ hasMedia : true });
            this.user.stream = stream;

            try{
                this.myVideo.srcObject = stream;
            }catch(e){
                this.myVideo.src = URL.createObjectURL(stream);
            }
            

            this.myVideo.play();
        });
    }

    setUpPusher() {

        Pusher.logToConsole = true;
        this.pusher = new Pusher(APP_KEY, {
            authEndpoint : '/pusher/auth',
            cluster : 'ap1',
            auth: {
                params: this.user.id,
                headers: {
                    'X-CSRF-Token': window.csrfToken
                }
            }
        });

        this.channel = this.pusher.subscribe("presence-video-channel");
        //presence-video-channel
        this.channel.bind(`client-signal-${this.user.id}`, (signal) => {

            let peer = this.peers[signal.userId];

            //if peer is not already exists, we got an incoming call
            if(peer == undefined ){
                this.setState({ otherUserId : signal.userId });

                peer = this.startPeer(signal.userId, false);
            }
            peer.signal(signal.data);
        });
    }

    startPeer(userId, initiator = true){
        const peer = new Peer({
            initiator,
            stream: this.user.stream,
            trickle: false
        });

        peer.on('signal', (data) => {
            this.channel.trigger(`client-signal-${userId}`, {
                type: 'signal',
                userId: this.user.id,
                data:data
            });
        });

        peer.on('stream', (stream) => {
            try{
                this.userVideo.srcObject = stream;
            }catch(e){
                this.userVideo.src = URL.createObjectURL(stream);
            }

            this.userVideo.play();
        });

        peer.on('close', () => {
            let peer = this.peers[userId];
            if(peer != undefined){
                peer.destroy();
            }
            this.peers[userId] = undefined;
        });

        return peer;
    }

    callTo(userId){
        this.peers[userId] = this.startPeer(userId);
    }

    render() {
        return (
            <div className="card">
                <div className="card-header">
                {[1,2,3,4].map((userId) => {
                    return this.user.id != userId ? <button onClick={() => this.callTo(userId)}> call {userId}</button> : null;
                })}
                </div>
                <div className="row">
                    <div className="col-md-6">
                        <div className="card">
                            <video className="card-body" ref={(ref) => {this.myVideo = ref;}}></video>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="card">
                            <video className="card-body" ref={(ref) => {this.userVideo = ref;}}></video>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
}

if (document.getElementById('app')) {
    ReactDOM.render(<App />, document.getElementById('app'));
}
