const express=require('express');
const router=express.Router();
const User=require('../models/User');
const bcrypt=require('bcrypt');
const UserVerification=require('../models/UserVerification')
const nodemailer=require('nodemailer');
const path=require('path'); 
const {v4:uuidv4}=require('uuid');

require("dotenv").config()

let transporter=nodemailer.createTransport({
    service:"gmail",
    auth:{
        user:process.env.AUTH_EMAIL,
        pass:process.env.AUTH_PASS
    }
})

transporter.verify((error,success)=>{
    if(error){
        console.log("error")
    }
    else{
        console.log("ready for messages")
        console.log(success)
    }
})

router.post('/signup',(req,res)=>{
    let {name,email,password,dateOfBirth}=req.body;
    name=name.trim();
    email=email.trim();
    password=password.trim();
    dateOfBirth=dateOfBirth.trim();

    if(name=="" || email=="" || password=="" || dateOfBirth==""){
        res.json({
            status:"FAILED",
            message:"Empty input fields!"   
        })
    }
    else if(!/^[a-zA-Z]*$/.test(name)){
        res.json({
            status:"FAILED",
            message:"Invalid name entered!"   
        })
    }
    else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
        res.json({
            status:"FAILED",
            message:"Invalid email entered!"   
        })
    }
    else if(!new Date(dateOfBirth).getTime()){
        res.json({
            status:"FAILED",
            message:"Invalid date of birth entered!"   
        })
    }
    else if(password.length<8){
        res.json({
            status:"FAILED",
            message:"Password is too short!"   
        });
    }
    else{
        User.find({email})
        .then(result=>{
            if(result.length){
                res.json({
                    status:"FAILED",
                    message:"User with the provided email already exists"   
                })
            }
            else{
                const saltround=10;
                bcrypt.hash(password,saltround).then(hashedPassword=>{
                        const newUser=new User({
                            name,
                            email,
                            password:hashedPassword,
                            dateOfBirth,
                            verified:false
                        });
                        newUser.save().then(result=>{
                            sendVerificationEmail(result,res);
                        })
                        .catch(err=>{
                            res.json({
                                status:"FAILED",
                                message:"error occured while saving user account!"   
                            })
                        })
                })

                .catch(err=>{
                    res.json({
                        status:"FAILED",
                        message:"error occured while hashing!"   
                    })
                })
            }
        })
        .catch(err=>{
            console.log(err);
            res.json({
                status:"FAILED",
                message:"An error occured while checking for existing user"   
            })
        })
    }

})


const sendVerificationEmail=({_id,email},res)=>{
    const currentUrl="http://localhost:5000/";
    const uniqueString=uuidv4()+_id;

    const mailOptions={
        from:process.env.AUTH_EMAIL,
        to:email,
        subject:"Verify your Email",
        html:`<p>Verify your email address to complete the sign up and login into your account.</p>
        <p>This link<b>expires in 6 hours</b>.</p><p>Press <a href=${currentUrl+"user/verify/"+_id+"/"+uniqueString}>here
        </a>to proceed.</p>`
    };

    const saltround=10;
    bcrypt.hash(uniqueString,saltround)
    .then((hashedUniqueString)=>{
        const newVerification=new UserVerification({
            userId:_id,
            uniqueString:hashedUniqueString,
            createdAt:Date.now(),
            expiresAt:Date.now()+21600000,
        });
        newVerification.save()
        .then(()=>{
            transporter.sendMail(mailOptions)
            .then(()=>{
                res.json({
                    status:"PENDING",
                    message:"verification email sent"   
                })
            })
            .catch((error)=>{
                console.log(error)
                res.json({
                    status:"FAILED",
                    message:"VERIFICATION EMAIL FAILED"   
                })
            })
        })
        .catch((error)=>{
        
            res.json({
                status:"FAILED",
                message:"could not save verification email data"   
            })
        })
    })
    .catch((error)=>{
        console.log(error)
        res.json({
            status:"FAILED",
            message:"Error occured while hashing email data"
        })
    })
}


router.get("/verify/:userId/:uniqueString",(req,res)=>{
    let{userId,uniqueString}=req.params;
    UserVerification.find({userId})
    .then((result)=>{
       if(result.length>0){
            const {expiresAt}=result[0];
            const hashedUniqueString=result[0].uniqueString; 
            if(expiresAt<Date.now()){
                UserVerification.deleteOne({userId})
                .then(result=>{
                    User.deleteOne({_id:userId})
                    .then(()=>{
                        let message="Link has expired please sign up again "
                        res.redirect(`/user/verified/error=true&message=${message}`);
                    })
                    .catch((error)=>{
                        let message="Clearing user with expired unique string failed"
                        res.redirect(`/user/verified/error=true&message=${message}`);
                    })
                })
                .catch((error)=>{
                    console.log(error);
                    let message="An error occured while clearing expired userverifcation record"
                    res.redirect(`/user/verified/error=true&message=${message}`);
                })
            }
            
            else{
                bcrypt.compare(uniqueString,hashedUniqueString)
                .then((result)=>{
                    if(result){
                        User.updateOne({_id:userId},{verified:true})
                        .then(()=>{
                            UserVerification.deleteOne({userId})
                            .then(()=>{
                                res.redirect('http://localhost:5174/login')
                            })
                            .catch((error)=>{
                                console.log(error);
                                let message="An error while finalizing successull verifation"
                                res.redirect(`/user/verified/error=true&message=${message}`);
                            })
                        })
                        .catch((error)=>{
                            console.log(error)
                            let message="An error while user record to show verified"
                            res.redirect(`/user/verified/error=true&message=${message}`);
                        })
                    }
                    else{
                        let message="Incorrect verification details passed check inbox"
                        res.redirect(`/user/verified/error=true&message=${message}`);
                    }
                })
                .catch((error)=>{
                    let message="An error occured while comapring unique Strings"
                    res.redirect(`/user/verified/error=true&message=${message}`);
                })
            }
       }
       else{
        let message="Account doesnot exist or has been already verified"
        // res.redirect(`/user/verified/error=true&message=${message}`);
        res.send(message);
       }
    })
    .catch((error)=>{
        console.log(error)
        let message="An error occured while checking existing user"
        res.redirect(`/user/verified/error=true&message=${message}`);
    })
})

router.get("/verified",(req,res)=>{
    res.sendFile(path.join(__dirname+"../index.html"));
})


router.post('/signin',(req,res)=>{
    let {email,password}=req.body;
    email=email.trim();
    password=password.trim();
    
    if(email=="" || password=="" ){
        res.json({
            status:"FAILED",
            message:"Empty credetinals!"   
        })
    }
    else{
        User.find({email})
        .then(data=>{
            if(data.length){

                if(!data[0].verified){
                    res.json({
                        status:"FAILED",
                        message:"EMAIL HAS NOT BEEN VERIFIED CHECK INBOX",
                        data: data
                    })
                }
                else{
                const hashedPassword=data[0].password;
                bcrypt.compare(password,hashedPassword).then(result=>{
                    if(result){
                        res.json({
                            status:"SUCCESS",
                            message:"Signin successful",
                            data: data
                        })
                    }
                    else{
                        res.json({
                            status:"FAILED",
                            message:"INVALID PASSWORD",
                            
                        })
                    }
                })
                .catch(err=>{
                    res.json({
                        status:"FAILED",
                        message:"Error occured while comparing PASSWORD",
                        
                    })
                })
            }
        }
            else{
                res.json({
                    status:"FAILED",
                    message:"INVALID CREDENTIALS ENTERED",
                    
                })
            }
        })
        .catch(err=>{
            res.json({
                status:"FAILED",
                message:"An error occured while checking for existing user",
                
            })
        })
    }
})

module.exports=router;