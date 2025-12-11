package com.ultimate.dicejava;

import androidx.appcompat.app.AppCompatActivity;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.TextView;

import java.util.Random;

public class MainActivity extends AppCompatActivity {
    Random ran;
    int dice;
    Button roll;
    ImageView diceImg;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        ran = new Random();
        dice = ran.nextInt(6);
        diceImg = findViewById(R.id.dice);
        roll =findViewById(R.id.roll_btn);
        roll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                switch (dice){
                    case 0:
                        diceImg.setImageResource(R.drawable.face_one);
                        break;
                    case 1:
                        diceImg.setImageResource(R.drawable.face_two);
                        break;
                    case 2:
                        diceImg.setImageResource(R.drawable.face_three);
                        break;
                    case 3:
                        diceImg.setImageResource(R.drawable.face_four);
                        break;
                    case 4:
                        diceImg.setImageResource(R.drawable.face_five);
                        break;
                    case 5:
                        diceImg.setImageResource(R.drawable.face_six);
                        break;
                }
                dice = ran.nextInt(6);
            }
        });
    }
}